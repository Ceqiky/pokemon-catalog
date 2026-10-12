import { useLayoutEffect } from "react";

/**
 * Ослабляет фольгу над заданным элементом (например, плашкой с текстом), не поднимая элемент над фольгой.
 * Строит SVG-маску для холста с фольгой: везде 100%, а над элементом — `strength` (0.5 = вдвое слабее).
 * Маска записывается в CSS-переменную --foil-mask грани карточки и пересчитывается при смене размеров.
 */
export default function useFoilDim(ref, strength = 0.5) {
  useLayoutEffect(() => {
    const el = ref.current;
    const face = el?.closest(".holo-card__face");
    if (!el || !face) return undefined;

    const update = () => {
      const w = face.clientWidth;
      const h = face.clientHeight;
      if (!w || !h) return;
      // Положение плашки внутри карточки (offset-значения не зависят от наклона и масштаба 3D-трансформаций).
      let x = el.offsetLeft;
      let y = el.offsetTop;
      for (let p = el.offsetParent; p && p !== face && !p.classList.contains("holo-card__content"); p = p.offsetParent) {
        x += p.offsetLeft;
        y += p.offsetTop;
      }
      const bw = el.offsetWidth;
      const bh = el.offsetHeight;
      const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
        `<path fill-rule='evenodd' d='M0 0H${w}V${h}H0Z M${x + r} ${y}H${x + bw - r}A${r} ${r} 0 0 1 ${x + bw} ${y + r}V${y + bh - r}A${r} ${r} 0 0 1 ${x + bw - r} ${y + bh}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + bh - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z'/>` +
        `<rect x='${x}' y='${y}' width='${bw}' height='${bh}' rx='${r}' fill-opacity='${strength}'/>` +
        `</svg>`;
      face.style.setProperty("--foil-mask", `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    observer.observe(face);
    return () => {
      observer.disconnect();
      face.style.removeProperty("--foil-mask");
    };
  }, [ref, strength]);
}
