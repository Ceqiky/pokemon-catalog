import { useEffect, useRef, useState } from "react";

const DURATION_MS = 700;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/** Число, которое плавно «считается» от старого значения к новому. */
export function useAnimatedNumber(value) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (from.current === value) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setShown(value);
      return undefined;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const step = (now) => {
      const k = Math.min(1, (now - start) / DURATION_MS);
      const current = Math.round(origin + (value - origin) * easeOut(k));
      from.current = current;
      setShown(current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return shown;
}

/** Компонент-обёртка: число плавно «считается» (синхронно с движением полоски). */
export default function AnimatedNumber({ value }) {
  return <span>{useAnimatedNumber(value)}</span>;
}
