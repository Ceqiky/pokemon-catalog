import { useEffect, useMemo, useRef, useState } from "react";
import PokemonList from "./PokemonList.jsx";
import { TYPE_COLORS } from "../data/typeColors.js";
import { useI18n } from "../i18n/index.jsx";
import { HeartIcon } from "./Icons.jsx";
import RU_NAMES from "../data/ruNames.json";

/** Каталог: поиск, фильтр по типу (чипы), избранное, бесконечная подгрузка при прокрутке. */
export default function Catalog({
  families, favorites, onFavorite, onSelect, activeId,
  loading, error, hasMore, onRetry, onLoadMore,
}) {
  const { t, label } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const sentinelRef = useRef(null);

  // Семейство попадает в список, если подходит хотя бы одна его стадия; показываем первую подходящую.
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/^#/, "");
    const matches = (pokemon) =>
      (!needle || pokemon.name.includes(needle) || (RU_NAMES[pokemon.id] ?? "").toLowerCase().includes(needle) || String(pokemon.id) === needle) &&
      (selectedType === "all" || pokemon.types.includes(selectedType)) &&
      (!showFavoritesOnly || favorites.includes(pokemon.id));

    return families.flatMap((family) => {
      const index = family.members.findIndex(matches);
      return index < 0 ? [] : [{ family, index }];
    });
  }, [families, query, selectedType, showFavoritesOnly, favorites]);

  // Бесконечный скролл: когда нижняя отметка приближается к экрану — грузим следующую страницу.
  // Избранное берётся только из уже загруженных покемонов, поэтому в этом режиме страницы не подгружаем
  // (иначе при пустом списке отметка всегда на экране и каталог бесконечно грузит всё подряд).
  // При поиске/фильтре по типу подгрузка идёт, но с паузой между страницами, чтобы не перегружать страницу.
  const autoLoad = hasMore && !loading && !error && !showFavoritesOnly;
  const filtering = query.trim() !== "" || selectedType !== "all";

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !autoLoad) return undefined;
    let timer = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        clearTimeout(timer);
        timer = setTimeout(onLoadMore, filtering ? 450 : 0);
      },
      { rootMargin: "700px 0px" }
    );
    observer.observe(node);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [autoLoad, filtering, onLoadMore]);

  const hasFilters = query.trim() !== "" || selectedType !== "all" || showFavoritesOnly;
  const resetFilters = () => {
    setQuery("");
    setSelectedType("all");
    setShowFavoritesOnly(false);
  };

  return (
    <section className="catalog-section" id="catalog" aria-label="Pokémon catalog">
      <div className="toolbar">
        <div className="search-field">
          <label className="sr-only" htmlFor="pokemon-search">{t("search.label")}</label>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id="pokemon-search"
            type="search"
            placeholder={t("search.placeholder")}
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          className={`favorites-toggle ${showFavoritesOnly ? "active" : ""}`}
          type="button"
          onClick={() => setShowFavoritesOnly((value) => !value)}
          aria-pressed={showFavoritesOnly}
          aria-label={t("filter.favorites")}
        >
          <HeartIcon filled={showFavoritesOnly} />
          <span>{favorites.length}</span>
        </button>
      </div>

      <div className="chips" role="group" aria-label={t("filter.type")}>
        <button type="button" className={`chip ${selectedType === "all" ? "is-on" : ""}`} aria-pressed={selectedType === "all"} onClick={() => setSelectedType("all")}>
          {t("filter.all")}
        </button>
        {Object.keys(TYPE_COLORS).map((value) => (
          <button
            key={value}
            type="button"
            className={`chip ${selectedType === value ? "is-on" : ""}`}
            style={{ "--type-color": TYPE_COLORS[value] }}
            aria-pressed={selectedType === value}
            onClick={() => setSelectedType(selectedType === value ? "all" : value)}
          >
            <i aria-hidden="true" />{label("type", value)}
          </button>
        ))}
      </div>

      {error && (
        <div className="error-message" role="alert">
          <span>{t(`error.${error}`)}</span>
          <button type="button" onClick={onRetry}>{t("error.retry")}</button>
        </div>
      )}

      <PokemonList
        rows={rows}
        favorites={favorites}
        onFavorite={onFavorite}
        onSelect={onSelect}
        activeId={activeId}
        loading={loading}
        emptyText={
          hasFilters
            ? <>{t("list.empty")} <button className="link-button" type="button" onClick={resetFilters}>{t("list.reset")}</button></>
            : t("list.none")
        }
      />

      <div ref={sentinelRef} className="sentinel" aria-hidden="true">
        {loading && rows.length > 0 && <span className="stage__loader" />}
      </div>
    </section>
  );
}
