import { useEffect, useState } from "react";
import { translate } from "../utils/translate.js";

const API_URL = "https://pokeapi.co/api/v2";
const cache = new Map();

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("details");
  return response.json();
}

const clean = (text) => text.replace(/[\f\n\r]+/g, " ").replace(/\s+/g, " ").trim();

/** Запись на нужном языке, при её отсутствии — английская. */
const pickLang = (entries, lang, key = "language") =>
  entries.find((entry) => entry[key].name === lang) ?? entries.find((entry) => entry[key].name === "en");

/** Множители урона по типам защиты: >1 — слабость. */
async function loadWeaknesses(types) {
  const relations = await Promise.all(types.map((type) => getJson(`${API_URL}/type/${type}`)));
  const multipliers = {};
  const apply = (list, factor) => list.forEach(({ name }) => { multipliers[name] = (multipliers[name] ?? 1) * factor; });
  relations.forEach(({ damage_relations: d }) => {
    apply(d.double_damage_from, 2);
    apply(d.half_damage_from, 0.5);
    apply(d.no_damage_from, 0);
  });
  return Object.entries(multipliers)
    .filter(([, value]) => value > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

async function loadAbility(entry, lang) {
  const data = await getJson(entry.ability.url);
  const named = data.names.find((item) => item.language.name === lang) ?? data.names.find((item) => item.language.name === "en");
  const effect = pickLang(data.effect_entries, lang);
  const flavor = pickLang(data.flavor_text_entries, lang);
  return {
    name: named?.name ?? entry.ability.name.replace(/-/g, " "),
    hidden: entry.is_hidden,
    text: clean(flavor?.flavor_text ?? effect?.short_effect ?? ""),
  };
}

async function load(id, lang) {
  const [pokemon, species] = await Promise.all([
    getJson(`${API_URL}/pokemon/${id}`),
    getJson(`${API_URL}/pokemon-species/${id}`),
  ]);
  const types = pokemon.types.map((item) => item.type.name);
  const [weaknesses, abilities] = await Promise.all([
    loadWeaknesses(types),
    Promise.all(pokemon.abilities.map((entry) => loadAbility(entry, lang))),
  ]);

  // Описание: самая свежая запись на выбранном языке (иначе английская).
  const entries = species.flavor_text_entries.filter((entry) => entry.language.name === lang);
  const pool = entries.length ? entries : species.flavor_text_entries.filter((entry) => entry.language.name === "en");
  const description = pool.length ? clean(pool[pool.length - 1].flavor_text) : "";

  const artwork = pokemon.sprites.other?.["official-artwork"];
  return {
    stats: pokemon.stats.map((item) => ({ name: item.stat.name, value: item.base_stat })),
    abilities,
    weaknesses,
    moves: pokemon.moves.map((item) => item.move.name.replace(/-/g, " ")),
    heldItems: pokemon.held_items.map((item) => item.item.name.replace(/-/g, " ")),
    baseExperience: pokemon.base_experience,
    cry: pokemon.cries?.latest ?? null,
    shiny: artwork?.front_shiny ?? pokemon.sprites.front_shiny ?? null,
    genus: pickLang(species.genera, lang)?.genus ?? "",
    description,
    habitat: species.habitat?.name ?? null,
    generation: species.generation?.name?.replace("generation-", "").toUpperCase() ?? null,
    captureRate: species.capture_rate,
    // gender_rate: доля самок в восьмых, -1 — бесполый.
    femaleShare: species.gender_rate < 0 ? null : (species.gender_rate / 8) * 100,
    growthRate: species.growth_rate?.name ?? null,
    legendary: species.is_legendary,
    mythical: species.is_mythical,
    eggGroups: species.egg_groups.map((group) => group.name),
  };
}

/**
 * Подробности покемона (кэшируются по id и языку). При смене id прежние данные остаются на экране,
 * пока не загрузятся новые: окно не схлопывается и не мигает спиннером.
 */
function useBaseDetails(id, lang) {
  const key = `${id}:${lang}`;
  const [state, setState] = useState(() => ({ key: cache.has(key) ? key : null, data: cache.get(key) ?? null, error: "" }));

  useEffect(() => {
    if (id == null) return undefined;
    if (cache.has(key)) {
      setState({ key, data: cache.get(key), error: "" });
      return undefined;
    }
    let cancelled = false;
    setState((current) => ({ ...current, error: "" }));
    load(id, lang)
      .then((data) => {
        cache.set(key, data);
        if (!cancelled) setState({ key, data, error: "" });
      })
      .catch(() => {
        if (!cancelled) setState((current) => ({ ...current, error: "details" }));
      });
    return () => { cancelled = true; };
  }, [id, lang, key]);

  return { data: state.data, dataKey: state.key, error: state.error, loading: state.key !== key && !state.error };
}

/**
 * Подробности покемона. PokéAPI почти не содержит русских текстов, поэтому в русском режиме
 * английские описания, способности и приёмы переводятся лениво (и один раз — результат кэшируется).
 * Пока перевод идёт, показывается оригинал.
 */
export default function usePokemonDetails(id, lang) {
  const base = useBaseDetails(id, lang);
  const [translated, setTranslated] = useState(null);
  const data = base.data;

  useEffect(() => {
    if (lang !== "ru" || !data) {
      setTranslated(null);
      return undefined;
    }
    let cancelled = false;

    (async () => {
      // Названия приёмов не переводим: автоперевод одиночных слов ошибается (Tackle → «снасти»).
      const [description, genus, abilities] = await Promise.all([
        translate(data.description),
        translate(data.genus),
        Promise.all(data.abilities.map(async (ability) => ({
          ...ability,
          name: await translate(ability.name),
          text: await translate(ability.text),
        }))),
      ]);
      if (!cancelled) setTranslated({ source: data, description, genus, abilities });
    })();

    return () => { cancelled = true; };
  }, [data, lang]);

  const ready = translated && translated.source === data;
  return {
    data: data && ready ? { ...data, description: translated.description, genus: translated.genus, abilities: translated.abilities } : data,
    dataKey: base.dataKey,
    error: base.error,
    loading: base.loading,
    translating: lang === "ru" && Boolean(data) && !ready,
  };
}
