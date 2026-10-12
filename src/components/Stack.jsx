import { useEffect, useLayoutEffect, useRef } from "react";
import useSwipe from "../hooks/useSwipe.js";
import { useI18n } from "../i18n/index.jsx";
import { HEART_PATH } from "./Icons.jsx";
import "./Stack.css";

// Позиции слоёв колоды (в стиле React Bits Stack): смещение, поворот, масштаб, прозрачность.
const LAYERS = [
  { x: 0, y: 0, r: 0, s: 1, o: 1 },
  { x: 12, y: 16, r: 4.5, s: 0.95, o: 1 },
  { x: -14, y: 30, r: -5, s: 0.9, o: 0.95 },
  { x: 20, y: 44, r: 8, s: 0.85, o: 0.7 },
  { x: -20, y: 56, r: -9, s: 0.8, o: 0 },
];

/**
 * Stack — управляемая колода. items[0] — верхняя (активная) карточка.
 * Верхнюю карточку можно утащить пальцем/мышью; по порогу она улетает,
 * после чего вызывается onSwipe и родитель сдвигает очередь.
 * Нижние карточки подтягиваются вверх пропорционально смещению (--p).
 */
export default function Stack({ items, renderCard, onSwipe, onDetails, ariaLabel, className = "" }) {
  const { t } = useI18n();
  const rootRef = useRef(null);
  const topRef = useRef(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const swipe = useSwipe({
    enabled: items.length > 1,
    onSwipeUp: onDetails,
    onTap: onDetails,
    onProgress: (p, sign) => {
      const root = rootRef.current;
      if (!root) return;
      root.style.setProperty("--p", p);
      // Кольцо значка живёт на отдельном значении --rp: во время жеста следует за пальцем, а после отпускания
      // остаётся как есть и гаснет вместе со значком (не «сматывается» обратно вместе с --p).
      if (root.dataset.dragging === "true" || p >= 1) root.style.setProperty("--rp", p);
      // Направление остаётся после броска, пока засвет гаснет.
      if (sign) root.dataset.dir = sign > 0 ? "right" : "left";
      if (p >= 1 && root.dataset.dragging === "false") root.dataset.commit = "true";
    },
    onDragChange: (dragging) => {
      const root = rootRef.current;
      if (!root) return;
      root.dataset.dragging = dragging ? "true" : "false";
      if (dragging) {
        root.dataset.commit = "false";
        root.dataset.ringReset = "";
        root.style.setProperty("--rp", 0);
        requestAnimationFrame(() => requestAnimationFrame(() => delete root.dataset.ringReset));
      }
    },
    onExit: (dir, el) => {
      // Если за время полёта колоду заменили (выбор из каталога) — не сдвигаем лишний раз.
      if (el.dataset.uid !== String(itemsRef.current[0]?.uid)) {
        rootRef.current?.style.setProperty("--p", 0);
        return;
      }
      onSwipe(dir);
    },
  });

  // Палец: touch-обработчики вешаются на текущую верхнюю карточку
  useEffect(() => swipe.bindTouch(topRef.current), [items[0]?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Сбрасываем прогресс синхронно с новой раскладкой слоёв: визуальных скачков нет.
  const topUid = items[0]?.uid;
  useLayoutEffect(() => {
    rootRef.current?.style.setProperty("--p", 0);
  }, [topUid]);

  const handleKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") swipe.fling(topRef.current, -1);
    else if (event.key === "ArrowUp" || event.key === "Enter") onDetails?.();
    else if (event.key === "ArrowRight") swipe.fling(topRef.current, 1);
    else return;
    event.preventDefault();
  };

  return (
    <div
      ref={rootRef}
      className={`deck ${className}`.trim()}
      data-dragging="false"
      data-commit="false"
      role="group"
      aria-roledescription={t("deck.role")}
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Засвет экрана: зелёный — в избранное (вправо), красный — пропустить (влево). */}
      <div className="deck-glow" aria-hidden="true" />
      <svg className="swipe-badge swipe-badge--keep" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="swipe-badge__ring" cx="12" cy="12" r="11" pathLength="1" />
        <g transform="translate(5.280 4.890) scale(.56)"><path className="swipe-badge__icon" d={HEART_PATH} /></g>
        <circle className="swipe-badge__runner" cx="23" cy="12" r="1.100" />
      </svg>
      <svg className="swipe-badge swipe-badge--drop" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="swipe-badge__ring" cx="12" cy="12" r="11" pathLength="1" />
        <path className="swipe-badge__icon" d="M8.600 8.600l6.800 6.800M15.400 8.600l-6.800 6.800" />
        <circle className="swipe-badge__runner" cx="23" cy="12" r="1.500" />
      </svg>
      {items.slice(0, LAYERS.length).map((item, layer) => {
        const cur = LAYERS[layer];
        const nxt = LAYERS[Math.max(layer - 1, 0)];
        const isTop = layer === 0;
        return (
          <div
            key={item.uid}
            ref={isTop ? topRef : null}
            className="deck-card"
            data-layer={layer}
            data-uid={item.uid}
            data-swipe=""
            aria-hidden={isTop ? undefined : true}
            style={{
              zIndex: LAYERS.length - layer,
              "--layer": layer,
              "--lx": cur.x, "--ly": cur.y, "--lr": cur.r, "--ls": cur.s, "--lo": cur.o,
              "--nx": nxt.x, "--ny": nxt.y, "--nr": nxt.r, "--ns": nxt.s, "--no": nxt.o,
            }}
            {...(isTop ? swipe.handlers : {})}
          >
            {renderCard(item, isTop, layer)}
          </div>
        );
      })}
      {/* Затемнение экрана при свайпе: нижние карты и фон гаснут, верхняя карточка и значок остаются яркими */}
      <div className="deck-dim" aria-hidden="true" />
    </div>
  );
}
