import { useRef } from "react";
import AnimatedNumber from "./AnimatedNumber.jsx";
import Crossfade from "./Crossfade.jsx";
import PokemonImage from "./PokemonImage.jsx";
import TypeBadge from "./TypeBadge.jsx";
import { HeartIcon } from "./Icons.jsx";
import { TYPE_COLORS } from "../data/typeColors.js";
import { useI18n } from "../i18n/index.jsx";
import { art } from "../utils/image.js";
import useFoilDim from "../hooks/useFoilDim.js";
import "./PokemonFace.css";

const STAT_LABELS = [
  ["hp", "HP"],
  ["attack", "ATK"],
  ["defense", "DEF"],
  ["speed", "SPD"],
];
const STAT_MAX = 160;

export const formatId = (id) => String(id).padStart(3, "0");

/**
 * Лицевая сторона карточки (внутри HoloCard). Сама карточка при смене стадии эволюции не пересоздаётся:
 * цвета типа плавно перетекают (CSS-переменные), арт и имя меняются через Crossfade, полоски статов двигаются.
 */
export default function PokemonFace({ pokemon, interactive, isFavorite, onFavorite, evolutions = [], onEvolve }) {
  const panelRef = useRef(null);
  useFoilDim(panelRef, 0.5); // над плашкой фольга слабее на 50%
  const { t, pname } = useI18n();
  const [primary, secondary] = pokemon.types;
  const style = {
    "--type-color": TYPE_COLORS[primary] ?? "#9aa0b8",
    "--type-color-2": TYPE_COLORS[secondary ?? primary] ?? "#9aa0b8",
  };

  // Направление смены: вперёд по цепочке эволюции — новое входит справа, назад — слева.
  const previous = useRef({ id: pokemon.id, dir: 1 });
  if (previous.current.id !== pokemon.id) {
    const order = (id) => evolutions.findIndex((member) => member.id === id);
    previous.current = { id: pokemon.id, dir: order(pokemon.id) >= order(previous.current.id) ? 1 : -1 };
  }
  const dir = previous.current.dir;

  return (
    <div className="pface" style={style}>
      <div className="pface__tint" aria-hidden="true" />

      <header className="pface__top">
        <span className="pface__no">#{formatId(pokemon.id)}</span>
      </header>

      <div className="pface__art">
        <span className="pface__halo" aria-hidden="true" />
        <Crossfade id={pokemon.id} shift={dir * 44}>
          <PokemonImage src={art(pokemon.id, 560)} fallback={pokemon.image} alt="" eager priority={interactive ? "high" : "low"} />
        </Crossfade>
      </div>

      <div className="pface__evo-row">
        {interactive && evolutions.length > 1 && (
          <div className="pface__evo" role="group" aria-label={t("evo.group")} data-no-swipe>
            {evolutions.map((member) => (
              <button
                key={member.id}
                type="button"
                className={member.id === pokemon.id ? "is-on" : ""}
                aria-label={pname(member)}
                aria-pressed={member.id === pokemon.id}
                onClick={() => member.id !== pokemon.id && onEvolve(member.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pface__panel" ref={panelRef}>
        {interactive && (
          <button
            className={`pface__fav ${isFavorite ? "is-favorite" : ""}`}
            type="button"
            data-no-swipe
            aria-pressed={isFavorite}
            aria-label={isFavorite ? t("card.fav.remove") : t("card.fav.add")}
            onClick={() => onFavorite(pokemon.id)}
          >
            <HeartIcon filled={isFavorite} />
          </button>
        )}
        <Crossfade id={pokemon.id} shift={dir * 20}>
          <div className="pface__title">
            <h3>{pname(pokemon)}</h3>
            <div className="type-list">
              {pokemon.types.map((type) => <TypeBadge key={type} type={type} />)}
            </div>
          </div>
        </Crossfade>

        <dl className="pface__stats">
          {STAT_LABELS.map(([key, label]) => {
            const value = pokemon.stats?.[key] ?? 0;
            return (
              <div key={key}>
                <dt>{label}</dt>
                <dd><AnimatedNumber value={value} /></dd>
                <span className="pface__bar" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, (value / STAT_MAX) * 100)}%` }} />
                </span>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}
