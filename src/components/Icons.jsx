// Единая иконка сердца, чтобы везде (колода, каталог, фильтр) рисовалось одинаково.
export const HEART_PATH =
  "M12 20.800c-.3 0-.6-.1-.8-.3C6.800 16.800 3 13.500 3 9.400 3 6.700 5.100 4.600 7.700 4.600c1.700 0 3.400.9 4.300 2.400.9-1.500 2.600-2.400 4.300-2.400 2.600 0 4.700 2.100 4.700 4.800 0 4.100-3.800 7.400-8.200 11.100-.2.200-.5.300-.8.300z";

export function HeartIcon({ filled = false, className = "" }) {
  return (
    <svg className={`icon-heart ${filled ? "is-filled" : ""} ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      <path d={HEART_PATH} />
    </svg>
  );
}
