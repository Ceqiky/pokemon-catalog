import PokemonHoloCard from "./PokemonHoloCard.jsx";
import Stack from "./Stack.jsx";
import { formatId } from "./PokemonFace.jsx";
import { useI18n } from "../i18n/index.jsx";
import "./FeaturedDeck.css";

/**
 * First screen: just the interactive deck in the center.
 * Swipe right — save to favorites (green glow), left — skip (red). Tap the card for details.
 */
export default function FeaturedDeck({ items, familyOf, onSwipe, onDetails, onEvolve, favorites, onFavorite, onScrollDown, canReturn }) {
  const { t, pname } = useI18n();
  const current = items[0]?.pokemon;

  return (
    <section className="stage" id="featured" aria-label="Pokémon deck">
      {current ? (
        <Stack
          items={items}
          onSwipe={onSwipe}
          onDetails={onDetails}
          onScrollAway={onScrollDown}
          ariaLabel={t("deck.aria", { name: pname(current), no: formatId(current.id) })}
          renderCard={({ pokemon }, isTop, layer) => (
            <PokemonHoloCard
              pokemon={pokemon}
              interactive={isTop}
              live={layer <= 1}
              isFavorite={favorites.includes(pokemon.id)}
              onFavorite={onFavorite}
              evolutions={familyOf(pokemon.id)}
              onEvolve={onEvolve}
            />
          )}
        />
      ) : (
        <span className="stage__loader" role="status" aria-label={t("deck.loading")} />
      )}

      <button className={`stage__down ${canReturn ? "is-return" : ""}`} type="button" aria-label={t(canReturn ? "nav.back" : "nav.catalog")} onClick={onScrollDown}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <p className="sr-only" aria-live="polite">
        {current ? `${pname(current)}, #${formatId(current.id)}` : ""}
      </p>
    </section>
  );
}
