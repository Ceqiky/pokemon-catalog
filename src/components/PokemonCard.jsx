import { memo, useState } from "react";
import SpotlightCard from "./reactbits/SpotlightCard.jsx";
import PokemonImage from "./PokemonImage.jsx";
import TypeBadge from "./TypeBadge.jsx";
import { HeartIcon } from "./Icons.jsx";
import { TYPE_COLORS } from "../data/typeColors.js";
import { useI18n } from "../i18n/index.jsx";
import { art } from "../utils/image.js";

const formatId = (id) => `#${String(id).padStart(3, "0")}`;

/**
 * Карточка семейства эволюции. Раскладка: сверху арт (номер и сердце лежат на нём по углам — экономия места),
 * ниже имя и типы, внизу точки стадий эволюции и счётчик «2/3».
 * Принимает только примитивы (favMask — «101…» по стадиям), поэтому memo не даёт перерисовывать весь каталог.
 */
function PokemonCard({ family, defaultIndex, favMask, activeIndex, onFavorite, onSelect }) {
  const { t, pname } = useI18n();
  const [picked, setPicked] = useState(null);
  const index = picked ?? defaultIndex;
  const pokemon = family.members[index];
  const color = TYPE_COLORS[pokemon.types[0]] ?? "#9aa0b8";
  const name = pname(pokemon);
  const isFavorite = favMask[index] === "1";
  const isActive = activeIndex === index;
  const stages = family.members.length;

  return (
    <SpotlightCard
      className={`pokemon-card ${isActive ? "is-active" : ""}`}
      style={{ "--type-color": color }}
      spotlightColor={color}
      intensity={0.22}
      spotlightSize={220}
      borderGlow={0.9}
      proximity={0}
    >
      <div className="pc-art">
        <span className="pokemon-id">{formatId(pokemon.id)}</span>
        <button
          className={`favorite-button ${isFavorite ? "is-favorite" : ""}`}
          type="button"
          aria-label={t(isFavorite ? "card.removeFav" : "card.addFav", { name })}
          aria-pressed={isFavorite}
          onClick={() => onFavorite(pokemon.id)}
        >
          <HeartIcon filled={isFavorite} />
        </button>
        <div className="pokemon-art" key={pokemon.id}>
          <PokemonImage src={art(pokemon.id, 360)} fallback={pokemon.image} alt="" />
        </div>
      </div>

      <div className="pc-info">
        <h2 className="pokemon-name">
          {/* Кнопка растягивается на всю карточку: клик в любом месте открывает покемона в колоде. */}
          <button
            className="pokemon-select"
            type="button"
            aria-current={isActive ? "true" : undefined}
            aria-label={t("card.show", { name })}
            onClick={() => onSelect(pokemon.id)}
          >
            {name}
          </button>
        </h2>
        <div className="type-list">
          {pokemon.types.map((type) => <TypeBadge key={type} type={type} />)}
        </div>
      </div>

      {stages > 1 && (
        <div className="pc-foot">
          <div className="evo" role="group" aria-label={t("evo.group")}>
            {family.members.map((member, i) => (
              <button
                key={member.id}
                type="button"
                className={`evo__dot ${i === index ? "is-on" : ""}`}
                aria-label={pname(member)}
                aria-pressed={i === index}
                onClick={() => setPicked(i)}
              />
            ))}
          </div>
        </div>
      )}
    </SpotlightCard>
  );
}

export default memo(PokemonCard);
