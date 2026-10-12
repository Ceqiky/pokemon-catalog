import { useEffect, useId, useRef } from "react";
import { useAnimatedNumber } from "./AnimatedNumber.jsx";
import pikachuSvg from "../assets/pikachu.svg?raw";
import "./PikachuLoader.css";

// Контур силуэта берём из того же SVG: им же вырезаем жидкость и рисуем неоновую обводку.
const OUTLINE = pikachuSvg.match(/ d="([^"]+)"/)?.[1] ?? "";
const VB_W = 675;
const STEP = 15; // расстояние между столбцами воды по горизонтали
const X0 = -30; // поверхность чуть шире силуэта, чтобы края не просвечивали
const COLS = Math.ceil((VB_W + 60) / STEP) + 1;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Линия поверхности по высотам столбцов (сглаженная) и замкнутая заливка до дна. */
function surfacePath(heights) {
  let line = `M${X0} ${heights[0].toFixed(1)}`;
  for (let i = 1; i < COLS - 1; i++) {
    const x = X0 + i * STEP;
    const mx = (x + x + STEP) / 2;
    const my = (heights[i] + heights[i + 1]) / 2;
    line += `Q${x} ${heights[i].toFixed(1)} ${mx} ${my.toFixed(1)}`;
  }
  const last = COLS - 1;
  line += `L${X0 + last * STEP} ${heights[last].toFixed(1)}`;
  return { line, fill: `${line}L${X0 + last * STEP} 760L${X0} 760Z` };
}

/**
 * Прогресс-бар: силуэт Пикачу наполняется жёлтой неоновой жидкостью с живой волнистой поверхностью.
 * Уровень догоняет значение как пружина, поверхность — ряд связанных столбцов воды (волны бегут, отражаются
 * от стенок и затухают), наклон — маятник, который раскачивает подъём уровня и лёгкая качка. Проценты по центру: белые, над жидкостью — синие.
 */
export default function PikachuLoader({ value, label }) {
  const id = useId().replace(/:/g, "");
  const outlineRef = useRef(null);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const crestRef = useRef(null);
  const clipRef = useRef(null);
  const shown = useAnimatedNumber(Math.round(value));
  const target = useRef(0);
  target.current = clamp(value / 100, 0, 1);

  useEffect(() => {
    const outline = outlineRef.current;
    const front = frontRef.current;
    const back = backRef.current;
    const crest = crestRef.current;
    const clip = clipRef.current;
    if (!outline || !front || !back || !crest || !clip) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Уровень жидкости считаем по реальной высоте силуэта: от стоп до кончиков ушей.
    const box = outline.getBBox();
    const bottom = box.y + box.height + 10;
    const range = box.height + 10;

    // Уровень воды (пружина с небольшим перелётом) и «маятник» наклона поверхности
    const level = { x: 0, v: 0 };
    const sway = { tilt: 0, tiltV: 0 };
    // Ряд связанных столбцов: каждый тянется к нулю и «передаёт» движение соседям — так бегут и отражаются волны
    const h = new Float32Array(COLS);
    const v = new Float32Array(COLS);
    const surface = new Float32Array(COLS);
    const surfaceBack = new Float32Array(COLS);

    let t = 0;
    let last = performance.now();
    let nextDrop = 0;
    let prevLevelV = 0;
    let raf = 0;

    const tick = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      t += dt;

      // 1. Уровень воды догоняет цель: пружина, чуть недодемпфированная — при рывке вода слегка перелетает
      const K = 30;
      const C = 7;
      level.v += ((target.current - level.x) * K - level.v * C) * dt;
      level.x = clamp(level.x + level.v * dt, -0.02, 1.04);
      const levelAcc = (level.v - prevLevelV) / Math.max(dt, 1e-3);
      prevLevelV = level.v;

      // 2. Наклон: маятник, который раскачивают ускорение уровня и лёгкая «качка» (будто сосуд держат в руках)
      const W = 3.1; // собственная частота (период около 2 секунд)
      const Z = 0.16; // слабое затухание — поверхность покачивается несколько раз
      const drive = reduce ? 0 : levelAcc * -90 + Math.sin(t * 1.15) * 55 + Math.sin(t * 0.43 + 1.2) * 70;
      sway.tiltV += (drive - W * W * sway.tilt - 2 * Z * W * sway.tiltV) * dt;
      sway.tilt = clamp(sway.tilt + sway.tiltV * dt, -48, 48);

      // 3. Волны: возмущения от подъёма воды и капли
      if (!reduce) {
        const energy = Math.abs(level.v);
        nextDrop -= dt;
        if (nextDrop <= 0) {
          nextDrop = 0.07 + Math.random() * 0.22;
          const j = 1 + Math.floor(Math.random() * (COLS - 2));
          v[j] += (Math.random() < 0.5 ? -1 : 1) * (45 + energy * 700) * (0.5 + Math.random());
        }
      }
      // Явная схема с подшагами: восстановление + связь с соседями + трение; стенки отражают волну
      const SUB = 3;
      const sdt = dt / SUB;
      for (let s = 0; s < SUB; s++) {
        for (let i = 0; i < COLS; i++) {
          const l = h[i === 0 ? 0 : i - 1];
          const r = h[i === COLS - 1 ? i : i + 1];
          v[i] += (-14 * h[i] + 1700 * (l + r - 2 * h[i]) - 1.5 * v[i]) * sdt;
        }
        for (let i = 0; i < COLS; i++) h[i] = clamp(h[i] + v[i] * sdt, -34, 34);
      }

      // 4. Поверхность = уровень + наклон + волны; на самом дне и под самым верхом волна гаснет
      const base = bottom - level.x * range;
      const edge = Math.min(1, Math.max(0, level.x) * 9, (1.04 - level.x) * 9);
      for (let i = 0; i < COLS; i++) {
        const x = X0 + i * STEP;
        const tiltPx = sway.tilt * ((x - VB_W / 2) / (VB_W / 2));
        surface[i] = base + tiltPx + h[i] * edge;
        // Дальняя волна: то же море, но со сдвигом и меньшей амплитудой — получается объём
        surfaceBack[i] = base - 9 + tiltPx * 0.8 + h[clamp(i + 5, 0, COLS - 1)] * 0.8 * edge;
      }
      const front_ = surfacePath(surface);
      const back_ = surfacePath(surfaceBack);
      front.setAttribute("d", front_.fill);
      back.setAttribute("d", back_.fill);
      crest.setAttribute("d", front_.line);
      clip.setAttribute("d", front_.fill); // форма жидкости: по ней обрезается синяя копия цифр
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pika" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <svg className="pika__svg" viewBox="0 0 675 656" aria-hidden="true">
        <defs>
          <clipPath id={`pika-clip-${id}`}><path d={OUTLINE} /></clipPath>
          <clipPath id={`pika-liquid-clip-${id}`}><path ref={clipRef} /></clipPath>
          <linearGradient id={`pika-liquid-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff36a" />
            <stop offset="0.55" stopColor="#ffe500" />
            <stop offset="1" stopColor="#ffc400" />
          </linearGradient>
        </defs>
        <path className="pika__glass" d={OUTLINE} ref={outlineRef} />
        <g clipPath={`url(#pika-clip-${id})`}>
          <path className="pika__wave pika__wave--back" ref={backRef} fill={`url(#pika-liquid-${id})`} />
          <path className="pika__wave" ref={frontRef} fill={`url(#pika-liquid-${id})`} />
          <path className="pika__crest" ref={crestRef} />
        </g>
        <path className="pika__edge" d={OUTLINE} />
        {/* Проценты: белые; поверх них синяя копия, обрезанная по форме жидкости. Так цифры меняют цвет ровно по буквам
            (без mix-blend-mode — он считается по прямоугольнику блока и на мобильных давал «коробку» вокруг текста). */}
        <text className="pika__num" x="334" y="378">{shown}%</text>
        <g clipPath={`url(#pika-liquid-clip-${id})`}>
          <text className="pika__num pika__num--liquid" x="334" y="378">{shown}%</text>
        </g>
      </svg>

    </div>
  );
}
