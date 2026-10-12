import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import FeaturedDeck from "./components/FeaturedDeck.jsx";
import Catalog from "./components/Catalog.jsx";
const PokemonDetails = lazy(() => import("./components/PokemonDetails.jsx"));
const LangSwitch = lazy(() => import("./components/LangSwitch.jsx"));
import Intro from "./components/Intro.jsx";
import { useI18n } from "./i18n/index.jsx";
import { art, preload } from "./utils/image.js";
import usePokemons from "./hooks/usePokemons.js";
import useDeckQueue from "./hooks/useDeckQueue.js";

const scrollToId = (id) => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
};

export default function App() {
  const { families, pokemons, loading, error, hasMore, retry, loadMore } = usePokemons();
  const { items, advance, evolve, activeId } = useDeckQueue(pokemons);
  const [favorites, setFavorites] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [textureReady, setTextureReady] = useState(false);
  const [introGone, setIntroGone] = useState(false);
  const { t } = useI18n();
  const topRef = useRef(null);
  const savedScroll = useRef(null); // место в каталоге, откуда ушли к колоде
  const [canReturn, setCanReturn] = useState(false);
  const top = items[0]?.pokemon ?? null;
  topRef.current = items[0]?.pokemon;

  // Когда ушли с экрана колоды: прячем переключатель языка и показываем кнопку «к колоде» (через атрибут — без перерисовок React)
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      document.documentElement.dataset.scrolled = window.scrollY > window.innerHeight * 0.55 ? "true" : "false";
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Интро скрывается, когда загружены данные и картинка первой карточки.
  useEffect(() => {
    if (textureReady || !top) return;
    preload(art(top.id, 560)).then(() => setTextureReady(true));
  }, [top, textureReady]);

  // Стадии эволюции по id покемона — для точек на карточке и блока в попапе.
  const familyById = useMemo(() => {
    const map = new Map();
    families.forEach((family) => family.members.forEach((member) => map.set(member.id, family.members)));
    return map;
  }, [families]);
  const familyOf = useCallback((id) => familyById.get(id) ?? [], [familyById]);

  const openDetails = useCallback(() => { if (topRef.current) setDetailsOpen(true); }, []);
  const closeDetails = useCallback(() => setDetailsOpen(false), []);

  const handleFavorite = useCallback((pokemonId) => {
    setFavorites((current) =>
      current.includes(pokemonId)
        ? current.filter((id) => id !== pokemonId)
        : [...current, pokemonId]
    );
  }, []);

  // Свайп вправо сохраняет покемона в избранное, влево — просто пропускает.
  const handleSwipe = useCallback((direction) => {
    const pokemon = topRef.current;
    if (direction > 0 && pokemon) {
      setFavorites((current) => (current.includes(pokemon.id) ? current : [...current, pokemon.id]));
    }
    advance();
  }, [advance]);

  // Выбор в каталоге обновляет и центральную карточку, и всю колоду.
  const handleSelect = useCallback((pokemonId) => {
    // Если выбрали из каталога — запоминаем, где были, чтобы можно было вернуться на то же место
    if (window.scrollY > window.innerHeight * 0.55) {
      savedScroll.current = window.scrollY;
      setCanReturn(true);
    }
    evolve(pokemonId);
    scrollToId("featured");
  }, [evolve]);

  return (
    <main className="app-shell">
      <Intro dataReady={pokemons.length > 0} imageReady={textureReady} error={error} onRetry={retry} onGone={() => setIntroGone(true)} />
      {introGone && <Suspense fallback={null}><LangSwitch /></Suspense>}
      <div className="page-bg" aria-hidden="true" />
      <FeaturedDeck
        items={items}
        familyOf={familyOf}
        onSwipe={handleSwipe}
        onDetails={openDetails}
        onEvolve={evolve}
        favorites={favorites}
        onFavorite={handleFavorite}
        onScrollDown={() => {
          if (savedScroll.current != null) {
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: savedScroll.current, behavior: reduce ? "auto" : "smooth" });
            savedScroll.current = null;
            setCanReturn(false);
          } else {
            scrollToId("catalog");
          }
        }}
        canReturn={canReturn}
      />
      <Catalog
        families={families}
        favorites={favorites}
        onFavorite={handleFavorite}
        onSelect={handleSelect}
        activeId={activeId}
        loading={loading}
        error={error}
        hasMore={hasMore}
        onRetry={retry}
        onLoadMore={loadMore}
      />
      <button className="to-deck" type="button" aria-label={t("nav.deck")} onClick={() => scrollToId("featured")}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
      </button>
      {detailsOpen && top && (
        <Suspense fallback={null}>
        <PokemonDetails
          pokemon={top}
          family={familyOf(top.id)}
          onClose={closeDetails}
          onSelect={evolve}
        />
        </Suspense>
      )}
    </main>
  );
}
