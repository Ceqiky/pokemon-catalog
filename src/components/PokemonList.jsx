import PokemonCard from "./PokemonCard.jsx";
import { useI18n } from "../i18n/index.jsx";

const SKELETON_COUNT = 8;

export default function PokemonList({ rows, favorites, onFavorite, onSelect, activeId, loading, emptyText }) {
  const { t } = useI18n();

  if (loading && rows.length === 0) {
    return (
      <div className="pokemon-grid" aria-busy="true" aria-label={t("list.loading")}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <div className="pokemon-card pokemon-card-skeleton" key={index} aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return <div className="status-message">{emptyText}</div>;
  }

  return (
    <div className="pokemon-grid">
      {rows.map(({ family, index }) => (
        <PokemonCard
          key={`${family.id}:${index}`}
          family={family}
          defaultIndex={index}
          favMask={family.members.map((member) => (favorites.includes(member.id) ? "1" : "0")).join("")}
          activeIndex={family.members.findIndex((member) => member.id === activeId)}
          onFavorite={onFavorite}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
