const ART_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

/** Оригинал (PNG ~150 КБ) — используется как запасной вариант. */
export const artOriginal = (id) => `${ART_BASE}/${id}.png`;
export const shinyOriginal = (id) => `${ART_BASE}/shiny/${id}.png`;

/**
 * Лёгкая версия картинки: бесплатный ресайзер wsrv.nl отдаёт WebP нужной ширины (≈15–30 КБ вместо ≈150 КБ).
 * Если сервис недоступен, PokemonImage автоматически переключается на оригинал.
 */
export const resized = (url, width) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ""))}&w=${width}&output=webp&q=80`;

export const art = (id, width) => resized(artOriginal(id), width);
export const shiny = (id, width) => resized(shinyOriginal(id), width);

const preloaded = new Map();

/** Заранее загружает картинку; промис выполняется и при ошибке, чтобы не блокировать интерфейс. */
export function preload(src) {
  if (!preloaded.has(src)) {
    preloaded.set(src, new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    }));
  }
  return preloaded.get(src);
}
