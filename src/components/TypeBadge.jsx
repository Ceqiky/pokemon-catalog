import { TYPE_COLORS } from "../data/typeColors.js";
import { useI18n } from "../i18n/index.jsx";

export default function TypeBadge({ type }) {
  const { label } = useI18n();
  const normalizedType = type?.toLowerCase() ?? "normal";
  const color = TYPE_COLORS[normalizedType] ?? "#777777";

  return (
    <span className="type-badge" style={{ "--type-color": color }}>
      {label("type", normalizedType)}
    </span>
  );
}
