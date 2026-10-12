import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const DECK_SIZE = 5;

let nextUid = 0;
const makeEntry = (id) => ({ uid: ++nextUid, id });

function pickRandom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Добирает очередь случайными покемонами без повторов внутри колоды. */
function fillQueue(queue, allIds) {
  const next = [...queue];
  const target = Math.min(DECK_SIZE, allIds.length);
  while (next.length < target) {
    const used = new Set(next.map((entry) => entry.id));
    const pool = allIds.filter((id) => !used.has(id));
    if (pool.length === 0) break;
    next.push(makeEntry(pickRandom(pool)));
  }
  return next;
}

/**
 * Очередь колоды: queue[0] — карточка в центре, остальные лежат под ней.
 * Следующий покемон выбирается заранее, поэтому колода и центральная карточка
 * всегда показывают одни и те же данные. uid уникален для каждого «появления»
 * карточки, чтобы React не переиспользовал улетевший элемент.
 */
export default function useDeckQueue(pokemons) {
  const [queue, setQueue] = useState([]);
  const queueRef = useRef(queue);
  const idsRef = useRef([]);

  idsRef.current = useMemo(() => pokemons.map((pokemon) => pokemon.id), [pokemons]);

  const commit = useCallback((next) => {
    queueRef.current = next;
    setQueue(next);
  }, []);

  useEffect(() => {
    if (queueRef.current.length === 0 && pokemons.length > 0) {
      commit(fillQueue([], idsRef.current));
    }
  }, [pokemons, commit]);

  /** Убирает верхнюю карточку и добавляет в конец новую случайную. */
  const advance = useCallback(() => {
    const rest = queueRef.current.slice(1);
    if (rest.length === 0) return;
    commit(fillQueue(rest, idsRef.current));
  }, [commit]);

  /** Показывает выбранного покемона сверху, остальную колоду добирает случайно. */
  const select = useCallback((id) => {
    if (queueRef.current[0]?.id === id) return;
    commit(fillQueue([makeEntry(id)], idsRef.current));
  }, [commit]);

  /**
   * Меняет покемона в верхней карточке, сохраняя её uid: сам элемент карточки не пересоздаётся,
   * поэтому смена стадии эволюции (из точек, каталога или попапа) идёт плавным переходом внутри неё.
   */
  const evolve = useCallback((id) => {
    const queue = queueRef.current;
    if (!queue.length || queue[0].id === id) return;
    const rest = queue.slice(1).filter((entry) => entry.id !== id);
    commit(fillQueue([{ ...queue[0], id }, ...rest], idsRef.current));
  }, [commit]);

  const byId = useMemo(() => new Map(pokemons.map((pokemon) => [pokemon.id, pokemon])), [pokemons]);
  const items = useMemo(
    () => queue.map((entry) => ({ uid: entry.uid, pokemon: byId.get(entry.id) })).filter((entry) => entry.pokemon),
    [queue, byId]
  );

  return { items, advance, select, evolve, activeId: items[0]?.pokemon.id ?? null };
}
