import RubberSegment from "./reactbits/RubberSegment.jsx";
import { useI18n } from "../i18n/index.jsx";

const ITEMS = [
  { value: "en", label: "EN" },
  { value: "ru", label: "RU" },
];

/** Переключатель языка интерфейса: React Bits RubberSegment (резиновый ползунок). */
export default function LangSwitch() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="lang-switch">
      <RubberSegment
        items={ITEMS}
        value={lang}
        onChange={setLang}
        aria-label={t("lang.switch")}
        size="sm"
        radius={99}
        inset={3}
        trackColor="rgba(14, 16, 26, .72)"
        thumbColor="#e9eeff"
        textColor="#c4cdf5"
        activeTextColor="#0a0c14"
        stretch={80}
        squash={2}
      />
    </div>
  );
}
