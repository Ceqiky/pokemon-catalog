import { useEffect, useRef, useState } from "react";

/**
 * Изображение покемона с индикатором загрузки (контур покебола) и запасным вариантом:
 * если лёгкая версия не загрузилась, пробуем оригинал (`fallback`), затем показываем заглушку.
 */
export default function PokemonImage({ src, fallback, alt, eager = false, priority, className = "" }) {
  const [current, setCurrent] = useState(src);
  const [status, setStatus] = useState("loading");
  const imgRef = useRef(null);

  useEffect(() => {
    setCurrent(src);
    const img = imgRef.current;
    setStatus(img?.complete && img.naturalWidth > 0 && img.src === src ? "loaded" : "loading");
  }, [src]);

  const handleError = () => {
    if (fallback && current !== fallback) {
      setCurrent(fallback);
      setStatus("loading");
    } else {
      setStatus("error");
    }
  };

  return (
    <span className={`pimg ${className}`.trim()} data-status={status}>
      {status === "error" ? (
        <span className="pimg__fallback" role="img" aria-label={alt}>?</span>
      ) : (
        <img
          ref={imgRef}
          src={current}
          alt={alt}
          draggable={false}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchpriority={priority} /* React 18 принимает атрибут только в нижнем регистре */
          onLoad={() => setStatus("loaded")}
          onError={handleError}
        />
      )}
    </span>
  );
}
