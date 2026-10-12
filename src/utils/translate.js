// Бесплатный перевод EN → RU для текстов, которых нет в PokéAPI на русском.
// Цепочка: кэш → встроенный Translator Chrome (на устройстве, без сети) → MyMemory.
// Результаты хранятся в localStorage, поэтому каждый текст переводится только один раз.

const STORAGE_KEY = "pokedex-tr-ru-v1";
const MAX_ENTRIES = 600;
const TIMEOUT_MS = 7000;

let store = null;
let nativeTranslator = null;
let nativeStarted = false;
const pending = new Map();

const load = () => {
  if (store) return store;
  try {
    store = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    store = {};
  }
  return store;
};

const save = () => {
  try {
    const keys = Object.keys(store);
    if (keys.length > MAX_ENTRIES) keys.slice(0, keys.length - MAX_ENTRIES).forEach((key) => delete store[key]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* хранилище переполнено или недоступно — не критично */ }
};

const race = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

/**
 * Встроенный переводчик Chrome готовится в фоне: пока он не создан, запросы идут сразу в сетевой сервис,
 * а не ждут (в некоторых сборках браузера Translator может зависать).
 */
export function warmTranslator() {
  if (nativeTranslator || nativeStarted || typeof self === "undefined" || !("Translator" in self)) return;
  nativeStarted = true;
  (async () => {
    try {
      const options = { sourceLanguage: "en", targetLanguage: "ru" };
      const availability = await race(self.Translator.availability(options), 3000);
      if (availability === "unavailable") return;
      nativeTranslator = await race(self.Translator.create(options), 120000);
    } catch { /* недоступен — работаем через сеть */ }
  })();
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

const engines = [
  async (text) => {
    if (!nativeTranslator) throw new Error("native not ready");
    return nativeTranslator.translate(text);
  },
  async (text) => {
    if (quotaHit) throw new Error("quota");
    const data = await fetchJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ru`);
    // При исчерпании квоты сервис возвращает предупреждение вместо перевода.
    if (data.responseStatus !== 200 || /MYMEMORY WARNING/i.test(data.responseData?.translatedText ?? "")) {
      quotaHit = true; // дневной лимит бесплатного API исчерпан — до перезагрузки больше не стучимся
      throw new Error("quota");
    }
    return data.responseData.translatedText;
  },
];

/** Названия игр в описаниях пишутся капсом, а переводчики на таком тексте ошибаются. */
const normalize = (text) => text.replace(/POKéMON/g, "Pokémon").replace(/\s+/g, " ").trim();

const withTimeout = (promise) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS))]);

let quotaHit = false;

async function run(text) {
  for (const engine of engines) {
    try {
      const result = await withTimeout(engine(text));
      if (result && result.trim() && result.trim().toLowerCase() !== text.toLowerCase()) return result.trim();
    } catch { /* пробуем следующий источник */ }
  }
  return null;
}

/** Переводит текст на русский. Если перевести не удалось — возвращает оригинал. */
export function translate(raw) {
  const text = normalize(raw ?? "");
  if (!text) return Promise.resolve("");
  const cache = load();
  if (cache[text]) return Promise.resolve(cache[text]);
  if (pending.has(text)) return pending.get(text);

  const job = run(text).then((result) => {
    pending.delete(text);
    if (!result) return text;
    cache[text] = result;
    save();
    return result;
  });
  pending.set(text, job);
  return job;
}
