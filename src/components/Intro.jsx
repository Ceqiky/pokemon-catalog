import { useEffect, useRef, useState } from "react";
import PikachuLoader from "./PikachuLoader.jsx";
import ShinyText from "./reactbits/ShinyText.jsx";
import { useI18n } from "../i18n/index.jsx";
import "./Intro.css";

/** Наполнение идёт намеренно неторопливо: не быстрее этого времени, даже если данные загрузились раньше. */
const FILL_MS = 4200;
const SPLASH_MS = 700; // пауза на 100%, чтобы было видно всплеск жидкости
const FADE_MS = 700;

/** Стартовый экран: силуэт Пикачу заполняется жёлтой неоновой жидкостью по мере загрузки. */
export default function Intro({ dataReady, imageReady, error, onRetry, onGone }) {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState(0);
  const [full, setFull] = useState(false);
  const [gone, setGone] = useState(false);
  const shown = useRef(0);

  // Часы интро: темп наполнения задаётся временем, а не скоростью сети.
  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => setElapsed(performance.now() - start), 100);
    return () => clearInterval(timer);
  }, []);

  const ready = dataReady && imageReady;
  const complete = ready && elapsed >= FILL_MS;

  useEffect(() => {
    if (!complete) return undefined;
    setFull(true);
    const timer = setTimeout(() => { setGone(true); onGone?.(); }, SPLASH_MS + FADE_MS);
    return () => clearTimeout(timer);
  }, [complete]);

  // Пока идёт загрузка, страницу под экраном не прокручиваем.
  useEffect(() => {
    if (gone) return undefined;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [gone]);

  // Цель = минимум из «времени» (плавная S-кривая до 96%) и «этапа загрузки»: реальная загрузка может только
  // притормозить наполнение (50% пока нет данных, 80% пока нет первой картинки), но не ускорить его.
  const paced = (0.5 - Math.cos(Math.PI * Math.min(1, elapsed / FILL_MS)) / 2) * 0.96;
  const stage = !dataReady ? 0.5 : imageReady ? 1 : 0.8;
  shown.current = full ? 1 : Math.max(shown.current, Math.min(paced, stage));

  if (gone) return null;

  return (
    <div className={`intro ${full ? "is-done" : ""}`} role="status" aria-live="polite" aria-label={t("intro.loading")}>
      <div className="intro__core">
        <PikachuLoader value={shown.current * 100} label={t("intro.loading")} />
        {error && !ready ? (
          <div className="intro__error">
            <p>{t(`error.${error}`)}</p>
            <button type="button" onClick={onRetry}>{t("intro.retry")}</button>
          </div>
        ) : (
          <ShinyText text={t("intro.loading")} color="rgba(215, 224, 255, .42)" shineColor="#ffffff" speed={2.4} shineWidth={50} className="intro__label" />
        )}
      </div>
    </div>
  );
}
