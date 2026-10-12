import { useEffect, useRef } from "react";

const EXIT_MS = 640;
const RETURN_MS = 620;
const START_DISTANCE = 6;
const FLING_VELOCITY = 0.6; // px/ms
const SCROLL_AWAY_DISTANCE = 110; // пальцем вверх на столько px — «пролистнуть» страницу ниже; меньше — страница стоит на месте

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const thresholdFor = (el) => Math.max(80, el.offsetWidth * 0.3);

/**
 * Свайп карточки: мышь и стилус — Pointer Events, палец — нативные touch-события (надёжнее на iOS).
 * Смещение пишется в CSS-переменные элемента через requestAnimationFrame,
 * поэтому React не перерисовывается на каждое движение указателя.
 *
 * Фазы элемента отражаются в data-swipe: "dragging" | "exiting" | "returning".
 */
export default function useSwipe({ enabled, onProgress, onDragChange, onExit, onSwipeUp, onTap, onScrollAway }) {
  const stateRef = useRef({
    id: null, el: null, x0: 0, y0: 0, dx: 0, dy: 0,
    dragging: false, vertical: false, busy: false, raf: 0, timer: 0,
    lastX: 0, lastT: 0, vx: 0,
  });
  const latest = useRef({});
  latest.current = { enabled, onProgress, onDragChange, onExit, onSwipeUp, onTap, onScrollAway };
  const s = stateRef.current;

  useEffect(() => () => {
    cancelAnimationFrame(s.raf);
    clearTimeout(s.timer);
  }, [s]);

  const paint = () => {
    s.raf = 0;
    const el = s.el;
    if (!el) return;
    el.style.setProperty("--dx", `${s.dx}px`);
    el.style.setProperty("--dy", `${s.dy * 0.35}px`);
    el.style.setProperty("--rot", `${clamp(s.dx * 0.07, -22, 22)}deg`);
    latest.current.onProgress?.(clamp(Math.abs(s.dx) / thresholdFor(el), 0, 1), Math.sign(s.dx));
  };

  const schedulePaint = () => {
    if (!s.raf) s.raf = requestAnimationFrame(paint);
  };

  const resetPointer = () => {
    s.id = null;
    s.dragging = false;
  };

  const snapBack = (el) => {
    cancelAnimationFrame(s.raf);
    s.raf = 0;
    resetPointer();
    el.dataset.swipe = "returning";
    el.style.setProperty("--dx", "0px");
    el.style.setProperty("--dy", "0px");
    el.style.setProperty("--rot", "0deg");
    latest.current.onDragChange?.(false);
    latest.current.onProgress?.(0, 0);
    clearTimeout(s.timer);
    s.timer = window.setTimeout(() => {
      if (el.dataset.swipe === "returning") el.dataset.swipe = "";
    }, RETURN_MS);
  };

  const exit = (el, dir) => {
    cancelAnimationFrame(s.raf);
    s.raf = 0;
    resetPointer();
    s.busy = true;
    el.dataset.swipe = "exiting";
    el.style.setProperty("--dx", `${dir * (window.innerWidth / 2 + el.offsetWidth + 80)}px`);
    el.style.setProperty("--dy", `${s.dy * 0.35 - 30}px`);
    el.style.setProperty("--rot", `${dir * 34}deg`);
    el.style.setProperty("--op", "0");
    latest.current.onDragChange?.(false);
    latest.current.onProgress?.(1, dir);
    clearTimeout(s.timer);
    s.timer = window.setTimeout(() => {
      s.busy = false;
      s.el = null;
      latest.current.onExit?.(dir, el);
    }, prefersReducedMotion() ? 60 : EXIT_MS + 30);
  };

  const onPointerDown = (event) => {
    if (event.pointerType === "touch") return; // палец обрабатывается touch-событиями (надёжнее на iOS)
    if (!latest.current.enabled || s.busy) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest("[data-no-swipe]")) return;
    // Игнорируем только второй палец. Новое основное касание всегда начинает жест заново:
    // так оборванный системным окном (например, запросом доступа к датчикам iOS) жест не блокирует свайп.
    if (!event.isPrimary) return;

    clearTimeout(s.timer);
    s.id = event.pointerId;
    s.el = event.currentTarget;
    s.x0 = event.clientX;
    s.y0 = event.clientY;
    s.dx = 0;
    s.dy = 0;
    s.dragging = false;
    s.lastX = event.clientX;
    s.lastT = event.timeStamp;
    s.vx = 0;
  };

  const onPointerMove = (event) => {
    if (event.pointerType === "touch") return;
    if (event.pointerId !== s.id || !s.el) return;
    const el = s.el;
    const dx = event.clientX - s.x0;
    const dy = event.clientY - s.y0;

    if (!s.dragging) {
      if (Math.hypot(dx, dy) < START_DISTANCE) return;
      s.dragging = true;
      try { el.setPointerCapture(event.pointerId); } catch { /* указатель уже недоступен */ }
      el.dataset.swipe = "dragging";
      latest.current.onDragChange?.(true);
    }

    const dt = event.timeStamp - s.lastT;
    if (dt > 0) s.vx = 0.8 * s.vx + 0.2 * ((event.clientX - s.lastX) / dt);
    s.lastX = event.clientX;
    s.lastT = event.timeStamp;
    s.dx = dx;
    s.dy = dy;
    schedulePaint();
  };

  /** Завершение жеста (общее для мыши и пальца): тап, свайп вверх, вылет или возврат. */
  const complete = (cancelled) => {
    const el = s.el;
    const wasDragging = s.dragging;
    const { dx, dy, vx } = s;
    resetPointer();
    if (!el) return;
    // Короткое касание без перетаскивания — это тап по карточке.
    if (!wasDragging) {
      if (!cancelled) latest.current.onTap?.();
      return;
    }

    // Свайп вверх (вертикаль преобладает) — открыть подробности, карточка возвращается на место.
    if (!cancelled && dy < -Math.max(70, el.offsetWidth * 0.25) && Math.abs(dy) > Math.abs(dx) * 1.3) {
      snapBack(el);
      latest.current.onSwipeUp?.();
      return;
    }

    const fast = Math.abs(vx) > FLING_VELOCITY && Math.abs(dx) > 30;
    const passed = Math.abs(dx) > thresholdFor(el) || fast;
    if (!cancelled && passed && latest.current.enabled) {
      exit(el, (fast ? vx : dx) < 0 ? -1 : 1);
    } else {
      snapBack(el);
    }
  };

  const finish = (event, cancelled) => {
    if (event.pointerType === "touch") return;
    if (event.pointerId !== s.id || !s.el) return;
    try { s.el.releasePointerCapture(event.pointerId); } catch { /* уже освобождён */ }
    complete(cancelled);
  };

  // ---- Палец: нативные touch-события. На iOS Safari Pointer Events с touch-action нередко обрываются
  // (pointercancel) в начале жеста, а нативный touchmove с preventDefault надёжно «забирает» горизонтальный жест.
  const touchStart = (event) => {
    if (!latest.current.enabled || s.busy) return;
    if (event.touches.length !== 1) return; // второй палец — не наш жест
    if (event.target.closest("[data-no-swipe]")) return;
    const t = event.touches[0];
    clearTimeout(s.timer);
    s.id = "touch";
    s.el = event.currentTarget;
    s.x0 = t.clientX;
    s.y0 = t.clientY;
    s.dx = 0;
    s.dy = 0;
    s.dragging = false;
    s.vertical = false;
    s.lastX = t.clientX;
    s.lastT = event.timeStamp;
    s.vx = 0;
  };

  const touchMove = (event) => {
    if (s.id !== "touch" || !s.el || !event.touches.length) return;
    const t = event.touches[0];
    const dx = t.clientX - s.x0;
    const dy = t.clientY - s.y0;

    // Страница под колодой стоит на месте (touch-action: none): случайный вертикальный дрейф при свайпе её не дёргает.
    // Вертикальный жест листает страницу только когда он явно вертикальный и длинный (см. touchEnd).
    if (!s.dragging) {
      if (Math.hypot(dx, dy) < START_DISTANCE) { if (event.cancelable) event.preventDefault(); return; }
      if (!s.vertical && Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx) * 1.5) s.vertical = true;
      if (s.vertical) {
        s.dx = dx;
        s.dy = dy;
        if (event.cancelable) event.preventDefault();
        return;
      }
      if (Math.abs(dx) < START_DISTANCE) { if (event.cancelable) event.preventDefault(); return; }
      s.dragging = true;
      s.el.dataset.swipe = "dragging";
      latest.current.onDragChange?.(true);
    }

    if (event.cancelable) event.preventDefault(); // пока тянем карточку, страница не прокручивается

    const dt = event.timeStamp - s.lastT;
    if (dt > 0) s.vx = 0.8 * s.vx + 0.2 * ((t.clientX - s.lastX) / dt);
    s.lastX = t.clientX;
    s.lastT = event.timeStamp;
    s.dx = dx;
    s.dy = dy;
    schedulePaint();
  };

  const touchEnd = (cancelled) => () => {
    if (s.id !== "touch") return;
    if (s.vertical) {
      const { dx, dy } = s;
      s.vertical = false;
      resetPointer();
      if (!cancelled && dy < -SCROLL_AWAY_DISTANCE && Math.abs(dy) > Math.abs(dx) * 2) latest.current.onScrollAway?.();
      return;
    }
    complete(cancelled);
  };

  /** Подключает touch-обработчики к элементу верхней карточки (touchmove должен быть неpassive — иначе нельзя остановить прокрутку). */
  const bindTouch = (el) => {
    if (!el) return undefined;
    const end = touchEnd(false);
    const cancel = touchEnd(true);
    el.addEventListener("touchstart", touchStart, { passive: true });
    el.addEventListener("touchmove", touchMove, { passive: false });
    el.addEventListener("touchend", end, { passive: true });
    el.addEventListener("touchcancel", cancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchmove", touchMove);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", cancel);
    };
  };

  /** Программный «свайп» для клавиатуры (стрелки), без кнопок в интерфейсе. */
  const fling = (el, dir) => {
    if (!el || !latest.current.enabled || s.busy) return;
    s.el = el;
    s.dx = 0;
    s.dy = 0;
    exit(el, dir);
  };

  return {
    fling,
    bindTouch,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event) => finish(event, false),
      onPointerCancel: (event) => finish(event, true),
      onLostPointerCapture: (event) => finish(event, true),
      onDragStart: (event) => event.preventDefault(),
    },
  };
}
