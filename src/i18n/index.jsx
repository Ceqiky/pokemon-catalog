import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import RU_NAMES from "../data/ruNames.json";
import { warmTranslator } from "../utils/translate.js";

const STORAGE_KEY = "pokedex-lang";

const DICT = {
  en: {
    "deck.aria": "Card deck. Now showing {name}, number {no}. Swipe right to save, left to skip, tap for details. Arrow keys work too.",
    "deck.loading": "Loading",
    "intro.loading": "Loading Pokédex",
    "intro.retry": "Try again",
    "d.translating": "Translating",
    "deck.role": "card deck",
    "unit.m": "m",
    "unit.kg": "kg",
    "nav.catalog": "Go to catalog",
    "nav.back": "Back to where you were in the catalog",
    "nav.deck": "Back to the deck",
    "lang.switch": "Language",
    "search.label": "Search Pokémon by name",
    "search.placeholder": "Search",
    "filter.favorites": "Favorites only",
    "filter.type": "Filter by type",
    "filter.all": "All",
    "list.empty": "Nothing found.",
    "list.reset": "Reset",
    "list.none": "Empty",
    "list.loading": "Loading Pokémon",
    "card.addFav": "Add {name} to favorites",
    "card.removeFav": "Remove {name} from favorites",
    "card.show": "Show {name} in the deck",
    "card.fav.add": "Add to favorites",
    "card.fav.remove": "Remove from favorites",
    "evo.group": "Evolution",
    "error.api": "PokéAPI is unavailable right now. Please try again.",
    "error.details": "Couldn't load details.",
    "error.unknown": "Something went wrong.",
    "error.retry": "Retry",
    "d.close": "Close",
    "d.loading": "Loading",
    "d.cry": "Play cry",
    "d.cry.label": "Cry",
    "d.shiny": "Shiny",
    "d.legendary": "Legendary",
    "d.mythical": "Mythical",
    "d.stats": "Base stats",
    "d.abilities": "Abilities",
    "d.hidden": "hidden",
    "d.weak": "Weaknesses",
    "d.evolution": "Evolution",
    "d.moves": "Moves",
    "d.facts": "Details",
    "d.links": "Learn more",
    "d.links.note": "PokéAPI has no anime data, so these open searches in other sites.",
    "d.height": "Height",
    "d.weight": "Weight",
    "d.xp": "Base XP",
    "d.catch": "Catch rate",
    "d.gender": "Gender",
    "d.genderless": "Genderless",
    "d.eggs": "Egg groups",
    "d.growth": "Growth",
    "d.items": "Held items",
    "d.habitat": "Habitat",
    "d.link.bulba": "Bulbapedia",
    "d.link.db": "Pokémon Database",
    "d.link.anime": "Anime clips on YouTube",
    "stat.hp": "HP",
    "stat.attack": "Attack",
    "stat.defense": "Defense",
    "stat.special-attack": "Sp. Atk",
    "stat.special-defense": "Sp. Def",
    "stat.speed": "Speed",
  },
  ru: {
    "deck.aria": "Колода карточек. Сейчас: {name}, номер {no}. Свайп вправо — сохранить, влево — пропустить, нажатие — подробности. Работают и стрелки.",
    "deck.loading": "Загрузка",
    "intro.loading": "Загружаем Покедекс",
    "intro.retry": "Повторить",
    "d.translating": "Переводим",
    "deck.role": "колода карточек",
    "unit.m": "м",
    "unit.kg": "кг",
    "nav.catalog": "К каталогу",
    "nav.back": "Вернуться к месту в каталоге",
    "nav.deck": "К колоде",
    "lang.switch": "Язык",
    "search.label": "Поиск покемона по имени",
    "search.placeholder": "Поиск",
    "filter.favorites": "Только избранное",
    "filter.type": "Фильтр по типу",
    "filter.all": "Все",
    "list.empty": "Ничего не найдено.",
    "list.reset": "Сбросить",
    "list.none": "Пусто",
    "list.loading": "Загружаем покемонов",
    "card.addFav": "Добавить {name} в избранное",
    "card.removeFav": "Убрать {name} из избранного",
    "card.show": "Показать {name} в колоде",
    "card.fav.add": "Добавить в избранное",
    "card.fav.remove": "Убрать из избранного",
    "evo.group": "Эволюция",
    "error.api": "PokéAPI сейчас недоступен. Попробуйте ещё раз.",
    "error.details": "Не удалось загрузить подробности.",
    "error.unknown": "Что-то пошло не так.",
    "error.retry": "Повторить",
    "d.close": "Закрыть",
    "d.loading": "Загрузка",
    "d.cry": "Воспроизвести крик",
    "d.cry.label": "Крик",
    "d.shiny": "Шайни",
    "d.legendary": "Легендарный",
    "d.mythical": "Мифический",
    "d.stats": "Базовые характеристики",
    "d.abilities": "Способности",
    "d.hidden": "скрытая",
    "d.weak": "Уязвимости",
    "d.evolution": "Эволюция",
    "d.moves": "Приёмы",
    "d.facts": "Подробности",
    "d.links": "Узнать больше",
    "d.links.note": "В PokéAPI нет данных об аниме, поэтому ссылки ведут на поиск на других сайтах.",
    "d.height": "Рост",
    "d.weight": "Вес",
    "d.xp": "Опыт за победу",
    "d.catch": "Шанс поимки",
    "d.gender": "Пол",
    "d.genderless": "Бесполый",
    "d.eggs": "Группы яиц",
    "d.growth": "Рост уровня",
    "d.items": "Предметы",
    "d.habitat": "Среда обитания",
    "d.link.bulba": "Bulbapedia",
    "d.link.db": "Pokémon Database",
    "d.link.anime": "Моменты из аниме на YouTube",
    "stat.hp": "Здоровье",
    "stat.attack": "Атака",
    "stat.defense": "Защита",
    "stat.special-attack": "Сп. атака",
    "stat.special-defense": "Сп. защита",
    "stat.speed": "Скорость",
    "type.normal": "Нормальный", "type.fire": "Огонь", "type.water": "Вода", "type.electric": "Электрический",
    "type.grass": "Трава", "type.ice": "Лёд", "type.fighting": "Боевой", "type.poison": "Яд",
    "type.ground": "Земля", "type.flying": "Полёт", "type.psychic": "Психический", "type.bug": "Жук",
    "type.rock": "Камень", "type.ghost": "Призрак", "type.dragon": "Дракон", "type.dark": "Тьма",
    "type.steel": "Сталь", "type.fairy": "Фея",
    "habitat.cave": "Пещеры", "habitat.forest": "Лес", "habitat.grassland": "Луга", "habitat.mountain": "Горы",
    "habitat.rare": "Редкая", "habitat.rough-terrain": "Бездорожье", "habitat.sea": "Море",
    "habitat.urban": "Город", "habitat.waters-edge": "Побережье",
    "egg.monster": "Монстр", "egg.water1": "Вода 1", "egg.water2": "Вода 2", "egg.water3": "Вода 3",
    "egg.bug": "Жук", "egg.flying": "Полёт", "egg.ground": "Земля", "egg.fairy": "Фея", "egg.plant": "Растение",
    "egg.humanshape": "Гуманоид", "egg.mineral": "Минерал", "egg.indeterminate": "Неопределённая",
    "egg.ditto": "Дитто", "egg.dragon": "Дракон", "egg.no-eggs": "Нет яиц",
    "growth.slow": "Медленный", "growth.medium": "Средний", "growth.fast": "Быстрый",
    "growth.medium-slow": "Средне-медленный", "growth.slow-then-very-fast": "Медл., затем очень быстрый",
    "growth.fast-then-very-slow": "Быстрый, затем очень медл.",
  },
};

const I18nContext = createContext(null);

const initialLang = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ru") return saved;
  } catch { /* хранилище недоступно */ }
  return "en";
};

const prettify = (text) => text.replace(/-/g, " ");
const titleCase = (text) => prettify(text).replace(/(^|\s)\S/g, (c) => c.toUpperCase());

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang === "ru") warmTranslator();
  }, [lang]);

  const setLang = useCallback((next) => {
    if (next === "ru") warmTranslator(); // клик пользователя разрешает браузеру скачать модель перевода
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* не критично */ }
  }, []);

  const value = useMemo(() => {
    const t = (key, vars) => {
      let text = DICT[lang][key] ?? DICT.en[key] ?? key;
      if (vars) Object.entries(vars).forEach(([name, replacement]) => { text = text.replace(`{${name}}`, replacement); });
      return text;
    };
    // Подпись из словаря, а при отсутствии перевода — читаемая версия кода API.
    const label = (prefix, code) => DICT[lang][`${prefix}.${code}`] ?? prettify(code).replace(/^./, (c) => c.toUpperCase());
    // Имя покемона: официальное русское (если есть в словаре) или английское.
    const pname = (pokemon) => (lang === "ru" && RU_NAMES[pokemon.id]) || titleCase(pokemon.name);
    return { lang, setLang, t, label, pname };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
