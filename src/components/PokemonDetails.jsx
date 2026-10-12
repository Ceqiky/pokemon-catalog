import { useCallback, useEffect, useRef, useState } from "react";
import usePokemonDetails from "../hooks/usePokemonDetails.js";
import { useI18n } from "../i18n/index.jsx";
import { playCry, stopCry } from "../utils/cry.js";
import { art, shiny as shinyArt } from "../utils/image.js";
import Crossfade from "./Crossfade.jsx";
import PokemonImage from "./PokemonImage.jsx";
import TypeBadge from "./TypeBadge.jsx";
import { TYPE_COLORS } from "../data/typeColors.js";
import "./PokemonDetails.css";

const STAT_MAX = 180;
const MOVES_SHOWN = 12;

/** Доля полов: значки — SVG, а не символы ♀/♂ (в шрифтах их глифы стоят на разной высоте и «сбивали» строку). */
function GenderShare({ femaleShare }) {
  const male = 100 - femaleShare;
  const pct = (value) => `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
  return (
    <span className="gender">
      <span className="gender__item gender__item--f">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5" /><path d="M12 14v7M9 18h6" /></svg>
        <span>{pct(femaleShare)}</span>
      </span>
      <span className="gender__item gender__item--m">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="14" r="5" /><path d="M14 10l6-6M15 4h5v5" /></svg>
        <span>{pct(male)}</span>
      </span>
    </span>
  );
}

/** Внешние ссылки открываем в новой вкладке явно: каталог остаётся на месте. */
const openExternal = (event) => {
  event.preventDefault();
  const tab = window.open(event.currentTarget.href, "_blank");
  if (tab) tab.opener = null; // новая вкладка не получает доступ к этой странице
};

const formatId = (id) => `#${String(id).padStart(3, "0")}`;
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** Попап с полными данными покемона. Закрывается по Esc, крестику и клику по фону. */
const CLOSE_MS = 260;

export default function PokemonDetails({ pokemon, family, onClose, onSelect }) {
  const { t, label, lang, pname } = useI18n();
  const { data, dataKey, loading, error, translating } = usePokemonDetails(pokemon.id, lang);
  const scrollRef = useRef(null);
  const [closing, setClosing] = useState(false);

  // Закрытие с анимацией (затухание и опускание окна), затем уже убираем попап из дерева
  const closeTimer = useRef(0);
  const requestClose = useCallback(() => {
    if (closeTimer.current) return;
    setClosing(true);
    stopCry();
    closeTimer.current = window.setTimeout(onClose, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : CLOSE_MS);
  }, [onClose]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const dialogRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [shiny, setShiny] = useState(false);
  const color = TYPE_COLORS[pokemon.types[0]] ?? "#9aa0b8";
  const total = data ? data.stats.reduce((sum, stat) => sum + stat.value, 0) : 0;
  const query = encodeURIComponent(pokemon.name); // ссылки ищем по английскому имени

  // Смена покемона (например, клик по эволюции) сбрасывает шайни и крик и плавно возвращает окно к началу.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setShiny(false);
    stopCry();
    setPlaying(false);
  }, [pokemon.id]);

  useEffect(() => {
    const previous = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus({ preventScroll: true });
    const onKey = (event) => { if (event.key === "Escape") requestClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      stopCry();
      previous?.focus?.({ preventScroll: true });
    };
  }, [requestClose]);

  const toggleCry = () => {
    if (!data?.cry) return;
    if (playing) {
      stopCry();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    playCry(data.cry, () => setPlaying(false));
  };

  return (
    <div className="details" data-closing={closing || undefined} onPointerDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <div
        ref={dialogRef}
        className="details__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-title"
        tabIndex={-1}
        style={{ "--type-color": color }}
      >
        <button className="details__close" type="button" aria-label={t("d.close")} onClick={requestClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="details__scroll" ref={scrollRef}>
          <header className="details__hero">
            <div className="details__art">
              <Crossfade id={`${pokemon.id}:${shiny}`} shift={36}>
                <PokemonImage
                  src={shiny ? shinyArt(pokemon.id, 520) : art(pokemon.id, 520)}
                  fallback={shiny ? undefined : pokemon.image}
                  alt=""
                  eager
                />
              </Crossfade>
            </div>
            <div className="details__title">
              <Crossfade id={pokemon.id} shift={22}>
                <div>
                  <span className="details__no">{formatId(pokemon.id)}</span>
                  <h2 id="details-title">{pname(pokemon)}</h2>
                  {data?.genus && <p className="details__genus">{data.genus}</p>}
                  <div className="type-list">{pokemon.types.map((type) => <TypeBadge key={type} type={type} />)}</div>
                </div>
              </Crossfade>
              <div className="details__tags">
                {(data?.legendary || data?.mythical) && (
                  <span className="tag tag--gold">{t(data.mythical ? "d.mythical" : "d.legendary")}</span>
                )}
                {data?.generation && <span className="tag">Gen {data.generation}</span>}
                {translating && <span className="tag tag--busy" role="status">{t("d.translating")}…</span>}
                {data?.cry && (
                  <button type="button" className={`tag tag--btn ${playing ? "is-on" : ""}`} onClick={toggleCry} aria-pressed={playing} aria-label={t("d.cry")}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zM16.500 8.500a5 5 0 010 7M19 6a8.500 8.500 0 010 12" /></svg>
                    {t("d.cry.label")}
                  </button>
                )}
                {data?.shiny && (
                  <button type="button" className={`tag tag--btn ${shiny ? "is-on" : ""}`} onClick={() => setShiny((value) => !value)} aria-pressed={shiny}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800L12 3zM18 16l.8 2.200L21 19l-2.200.8L18 22l-.8-2.200L15 19l2.200-.8L18 16z" /></svg>
                    {t("d.shiny")}
                  </button>
                )}
              </div>
            </div>
          </header>

          {error && <p className="details__status" role="alert">{t(`error.${error}`)}</p>}
          {loading && !data && <div className="details__status"><span className="stage__loader" role="status" aria-label={t("d.loading")} /></div>}

          {data && (
            <div className={`details__body ${loading ? "is-stale" : ""}`} key={dataKey} aria-busy={loading}>
              {data.description && <p className="details__lead">{data.description}</p>}

              <section aria-labelledby="d-stats">
                <h3 id="d-stats">{t("d.stats")} <b>{total}</b></h3>
                <ul className="d-stats">
                  {data.stats.map((stat) => (
                    <li key={stat.name}>
                      <span>{t(`stat.${stat.name}`)}</span>
                      <b>{stat.value}</b>
                      <i aria-hidden="true"><u style={{ width: `${Math.min(100, (stat.value / STAT_MAX) * 100)}%` }} /></i>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="d-abilities">
                <h3 id="d-abilities">{t("d.abilities")}</h3>
                <ul className="d-abilities">
                  {data.abilities.map((ability) => (
                    <li key={ability.name}>
                      <strong>{capitalize(ability.name)}{ability.hidden && <em>{t("d.hidden")}</em>}</strong>
                      {ability.text && <p>{ability.text}</p>}
                    </li>
                  ))}
                </ul>
              </section>

              {data.weaknesses.length > 0 && (
                <section aria-labelledby="d-weak">
                  <h3 id="d-weak">{t("d.weak")}</h3>
                  <div className="d-weak">
                    {data.weaknesses.map((weak) => (
                      <span key={weak.name} className="chip chip--static is-on" style={{ "--type-color": TYPE_COLORS[weak.name] }}>
                        <i aria-hidden="true" />{label("type", weak.name)} <small>×{weak.value}</small>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {family.length > 1 && (
                <section aria-labelledby="d-evo">
                  <h3 id="d-evo">{t("d.evolution")}</h3>
                  <ol className="d-evo">
                    {family.map((member) => (
                      <li key={member.id}>
                        <button
                          type="button"
                          className={member.id === pokemon.id ? "is-on" : ""}
                          aria-current={member.id === pokemon.id ? "true" : undefined}
                          onClick={() => onSelect(member.id)}
                          style={{ "--type-color": TYPE_COLORS[member.types[0]] }}
                        >
                          <PokemonImage src={art(member.id, 160)} fallback={member.image} alt="" />
                          <span>{pname(member)}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section aria-labelledby="d-facts">
                <h3 id="d-facts">{t("d.facts")}</h3>
                <dl className="d-facts">
                  <div><dt>{t("d.height")}</dt><dd>{(pokemon.height / 10).toFixed(1)} {t("unit.m")}</dd></div>
                  <div><dt>{t("d.weight")}</dt><dd>{(pokemon.weight / 10).toFixed(1)} {t("unit.kg")}</dd></div>
                  {data.baseExperience != null && <div><dt>{t("d.xp")}</dt><dd>{data.baseExperience}</dd></div>}
                  <div><dt>{t("d.catch")}</dt><dd>{data.captureRate}</dd></div>
                  <div>
                    <dt>{t("d.gender")}</dt>
                    <dd>{data.femaleShare == null ? t("d.genderless") : <GenderShare femaleShare={data.femaleShare} />}</dd>
                  </div>
                  {data.growthRate && <div><dt>{t("d.growth")}</dt><dd>{label("growth", data.growthRate)}</dd></div>}
                  {data.habitat && <div><dt>{t("d.habitat")}</dt><dd>{label("habitat", data.habitat)}</dd></div>}
                  {data.eggGroups.length > 0 && (
                    <div><dt>{t("d.eggs")}</dt><dd>{data.eggGroups.map((group) => label("egg", group)).join(", ")}</dd></div>
                  )}
                  {data.heldItems.length > 0 && (
                    <div className="wide"><dt>{t("d.items")}</dt><dd>{data.heldItems.map(capitalize).join(", ")}</dd></div>
                  )}
                </dl>
              </section>

              {data.moves.length > 0 && (
                <section aria-labelledby="d-moves">
                  <h3 id="d-moves">{t("d.moves")} <b>{data.moves.length}</b></h3>
                  <div className="d-moves">
                    {data.moves.slice(0, MOVES_SHOWN).map((move, i) => <span key={i}>{move}</span>)}
                    {data.moves.length > MOVES_SHOWN && <span className="more">+{data.moves.length - MOVES_SHOWN}</span>}
                  </div>
                </section>
              )}

              <section aria-labelledby="d-links">
                <h3 id="d-links">{t("d.links")}</h3>
                <div className="d-links">
                  <a href={`https://bulbapedia.bulbagarden.net/w/index.php?search=${query}`} target="_blank" rel="noopener noreferrer" onClick={openExternal}>{t("d.link.bulba")}<span aria-hidden="true">↗</span></a>
                  <a href={`https://pokemondb.net/pokedex/${query}`} target="_blank" rel="noopener noreferrer" onClick={openExternal}>{t("d.link.db")}<span aria-hidden="true">↗</span></a>
                  <a href={`https://www.youtube.com/results?search_query=${query}+pokemon+anime+moments`} target="_blank" rel="noopener noreferrer" onClick={openExternal}>{t("d.link.anime")}<span aria-hidden="true">↗</span></a>
                </div>
                <p className="d-note">{t("d.links.note")}</p>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
