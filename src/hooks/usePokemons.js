import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { artOriginal } from "../utils/image.js";

const PAGE_SIZE = 16;
const REST_URL = "https://pokeapi.co/api/v2";
const GRAPHQL_URL = "https://beta.pokeapi.co/graphql/v1beta";

const POKEMON_FIELDS = `
  id name height weight
  pokemon_v2_pokemontypes(order_by: {slot: asc}) { pokemon_v2_type { name } }
  pokemon_v2_pokemonstats { base_stat pokemon_v2_stat { name } }`;

// Одна страница цепочек эволюции целиком: 1 запрос и несколько КБ вместо десятков тяжёлых REST-запросов.
const FAMILIES_QUERY = `
  query Families($limit: Int, $offset: Int) {
    pokemon_v2_evolutionchain(limit: $limit, offset: $offset, order_by: {id: asc}) {
      id
      pokemon_v2_pokemonspecies(order_by: {id: asc}) {
        id evolves_from_species_id
        pokemon_v2_pokemons(where: {is_default: {_eq: true}}, limit: 1) { ${POKEMON_FIELDS} }
      }
    }
  }`;

const statOf = (stats, name) => stats.find((item) => item.pokemon_v2_stat.name === name)?.base_stat ?? 0;

function fromGraphql(data) {
  return {
    id: data.id,
    name: data.name,
    image: artOriginal(data.id),
    types: data.pokemon_v2_pokemontypes.map((item) => item.pokemon_v2_type.name),
    weight: data.weight,
    height: data.height,
    stats: {
      hp: statOf(data.pokemon_v2_pokemonstats, "hp"),
      attack: statOf(data.pokemon_v2_pokemonstats, "attack"),
      defense: statOf(data.pokemon_v2_pokemonstats, "defense"),
      speed: statOf(data.pokemon_v2_pokemonstats, "speed"),
    },
  };
}

/** Порядок стадий: корень цепочки, затем эволюции (обход в ширину). */
function orderStages(species) {
  const byParent = new Map();
  species.forEach((item) => {
    const key = item.evolves_from_species_id ?? 0;
    byParent.set(key, [...(byParent.get(key) ?? []), item]);
  });
  const ordered = [];
  const queue = [...(byParent.get(0) ?? [])];
  while (queue.length) {
    const item = queue.shift();
    ordered.push(item);
    queue.push(...(byParent.get(item.id) ?? []));
  }
  return ordered;
}

async function fetchPageGraphql(offset) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: FAMILIES_QUERY, variables: { limit: PAGE_SIZE, offset } }),
  });
  if (!response.ok) throw new Error("api");
  const { data } = await response.json();
  if (!data) throw new Error("api");

  const chains = data.pokemon_v2_evolutionchain;
  const families = chains
    .map((chain) => ({
      id: chain.id,
      members: orderStages(chain.pokemon_v2_pokemonspecies)
        .map((item) => item.pokemon_v2_pokemons[0])
        .filter(Boolean)
        .map(fromGraphql),
    }))
    .filter((family) => family.members.length > 0);
  return { families, hasMore: chains.length === PAGE_SIZE };
}

// ---- Запасной путь (REST), если GraphQL-бета недоступна ----
async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("api");
  return response.json();
}

const restStat = (stats, name) => stats.find((item) => item.stat.name === name)?.base_stat ?? 0;
const speciesId = (url) => Number(url.split("/").filter(Boolean).pop());

async function fetchPokemonRest(id) {
  const data = await getJson(`${REST_URL}/pokemon/${id}`);
  return {
    id: data.id,
    name: data.name,
    image: artOriginal(data.id),
    types: data.types.map((item) => item.type.name),
    weight: data.weight,
    height: data.height,
    stats: {
      hp: restStat(data.stats, "hp"),
      attack: restStat(data.stats, "attack"),
      defense: restStat(data.stats, "defense"),
      speed: restStat(data.stats, "speed"),
    },
  };
}

function flattenChain(chain) {
  const ids = [];
  const queue = [chain];
  while (queue.length) {
    const node = queue.shift();
    ids.push(speciesId(node.species.url));
    queue.push(...node.evolves_to);
  }
  return ids;
}

async function fetchPageRest(offset) {
  const page = await getJson(`${REST_URL}/evolution-chain?limit=${PAGE_SIZE}&offset=${offset}`);
  const loaded = await Promise.all(page.results.map(async (item) => {
    try {
      const chain = await getJson(item.url);
      const settled = await Promise.allSettled(flattenChain(chain.chain).map(fetchPokemonRest));
      const members = settled.filter((result) => result.status === "fulfilled").map((result) => result.value);
      return members.length ? { id: chain.id, members } : null;
    } catch {
      return null;
    }
  }));
  return { families: loaded.filter(Boolean), hasMore: Boolean(page.next) };
}

/**
 * Загрузка семейств эволюции. Страницы подгружаются по требованию (бесконечный скролл в Catalog).
 * Основной источник — GraphQL PokéAPI (один лёгкий запрос на страницу), запасной — REST.
 */
export default function usePokemons() {
  const [families, setFamilies] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setError("");

    try {
      let page;
      try {
        page = await fetchPageGraphql(offset);
      } catch {
        page = await fetchPageRest(offset);
      }
      setFamilies((current) => {
        const known = new Set(current.map((family) => family.id));
        return [...current, ...page.families.filter((family) => !known.has(family.id))];
      });
      setHasMore(page.hasMore);
    } catch (err) {
      setError(err instanceof Error && err.message === "api" ? "api" : "unknown");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(() => {
    if (!busyRef.current && hasMore) setOffset((current) => current + PAGE_SIZE);
  }, [hasMore]);

  const pokemons = useMemo(() => families.flatMap((family) => family.members), [families]);

  return { families, pokemons, loading, error, hasMore, retry: load, loadMore };
}
