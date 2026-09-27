import type { Dict } from "./en";
import { plural } from "./plural";

// Country names do not decline in Russian, so phrases avoid putting them after prepositions.

// The currency, Qzr, does not decline either: "1 Qzr", "5 Qzr", "за Qzr".

export const ru: Dict = {
  meta: {
    title: (country) => `Кликер флага: ${country}`,
    description: (country) => `${country}: тапайте по флагу, зарабатывайте Qzr, покупайте улучшения и поднимайтесь в престиже.`,
  },

  unavailable: "Игра временно недоступна. Загляните чуть позже.",

  header: {
    subtitle: "Кликер флага",
    language: "Язык",
  },

  account: {
    signIn: "Войти",
    settings: "Настройки",
    account: "Аккаунт",
    savedLocally: "Прогресс хранится в этом браузере",
    syncNow: "Синхронизировать",
    signOutEverywhere: "Выйти на всех устройствах",
    signOut: "Выйти",
    idle: "Прогресс синхронизируется с аккаунтом",
    syncing: "Синхронизация…",
    synced: (time) => `Синхронизировано в ${time}`,
    offline: "Нет связи, повторим позже",
    reset: "Сбросить прогресс",
    resetConfirm: "Нажмите ещё раз для сброса",
    resetDone: "Прогресс сброшен",
  },

  clicker: {
    points: "Qzyrium",
    perTap: "/ тап",
    perSec: "/ сек",
    hint: "Тапайте по флагу, чтобы зарабатывать Qzr",
    tapFlag: (country) => `Тапнуть по флагу: ${country}`,
    totalTaps: "Всего тапов",
    totalEarned: "Всего заработано",
    welcomeBack: "С возвращением!",
    awayIncome: (n, time) => `Турбо натапало ${n} Qzr за ${time}.`,
  },

  traffic: {
    signIn: "Войдите через Telegram, чтобы синхронизировать прогресс.",
    checking: "Проверяем турбо…",
    unavailable: () => "Турбо для этого аккаунта здесь недоступно. Всё остальное работает и без него.",
    none: (_, days) => `За последние ${days} ${plural(days, ["день", "дня", "дней"])} активности для турбо не было.`,
    active: (_bytes, _, days) =>
      [
        `Ваша активность за ${days} ${plural(days, ["день", "дня", "дней"])} тапает флаг `,
        " в секунду, а пока страница закрыта — вполовину медленнее (до 8 ч).",
      ] as [string, string],
    bought: () => ["Купленное за Qzr турбо тапает флаг ", " в секунду, а пока страница закрыта — вполовину медленнее (до 8 ч)."] as [string, string],
  },

  upgrades: {
    title: "Улучшения",
    description: "Тратьте Qzr, чтобы зарабатывать быстрее.",
    tabs: { tap: "Тап", luck: "Удача", boost: "Бонус" },
    reveal: (n) => `Заработайте ${n} Qzr, чтобы открыть`,
    level: (n) => `Ур. ${n}`,
    maxBadge: "МАКС",
    max: "Макс",
  },

  prestige: {
    title: "Престиж",
    description: (percent) =>
      `Qzr и улучшения сбросятся, а взамен вы получите Qzr ключи: каждый навсегда даёт +${percent}% к доходу. Остальное сохраняется.`,
    keys: "Qzr ключи",
    free: (n) => `свободно ${n}`,
    bonus: "Бонус к доходу",
    nextKey: "До следующего Qzr ключа",
    move: (keys, n) => `Престиж: +${keys} ${plural(n, ["Qzr ключ", "Qzr ключа", "Qzr ключей"])}`,
    nothing: "Пока не хватает на Qzr ключ",
    confirm: "Нажмите ещё раз — Qzr сгорят",
    done: "Престиж получен",
    doneHint: (keys, n, mult) => `+${keys} ${plural(n, ["Qzr ключ", "Qzr ключа", "Qzr ключей"])}. Доход теперь ×${mult}.`,
    perks: "Перки за Qzr ключи",
  },

  human: {
    title: "Проверка: нажмите на",
    missed: "Не то — попробуйте ещё раз.",
    notCounted: "Пока проверка не пройдена, тапы не засчитываются.",
    blocked: (time) => `Слишком много ошибок. Следующая проверка через ${time}`,
    loading: "Загружаем проверку…",
    retry: "Повторить",
    failed: "Не удалось загрузить проверку",
  },

  sync: {
    signInFailed: "Не удалось войти",
    tryLater: "Попробуйте позже.",
    signInErrors: {
      disabled: "Вход ещё не настроен.",
      cancelled: "Вход отменён.",
      access_denied: "Вход отменён.",
      blocked: "Этот аккаунт заблокирован.",
    },
    signedOut: "Вы вышли",
    expiredSync: "Сессия истекла — войдите снова, чтобы продолжить синхронизацию.",
    expired: "Сессия истекла, войдите снова.",
    offline: "Нет связи, попробуйте ещё раз.",
    serverErrors: {
      "Human check required": "Сначала пройдите проверку у флага.",
      "The check has expired, take a new one": "Проверка устарела, возьмите новую.",
      "Too many checks": "Слишком много проверок, подождите минуту.",
      "Too many answers": "Слишком много ответов, подождите минуту.",
      "Busy, try again": "Сервер занят, попробуйте ещё раз.",
      "No such pet": "Такого питомца нет.",
      "Not enough points": "Не хватает Qzr.",
      "Progress is too large": "Прогресс слишком большой.",
      "Sold out": "Распроданы.",
      "Highest rarity already": "Выше этой редкости уже некуда.",
      "Next series is full": "Серия следующей редкости уже заполнена.",
      "Take the pet off the market first": "Сначала снимите питомца с продажи.",
      "You can pin up to 5 pets": "Закрепить можно не больше 5 питомцев.",
    },
  },

  snake: {
    title: (country) => `Змейка: ${country}`,
    description: (country) => `Змейка на ноде «${country}»: собирайте кристаллы, растите и зарабатывайте Qzr.`,
    subtitle: "Змейка",
    score: "Счёт",
    best: "Рекорд",
    balance: "Баланс Qzr",
    play: "Играть",
    again: "Ещё раз",
    resume: "Продолжить",
    paused: "Пауза",
    over: "Игра окончена",
    hint: "Стрелки или WASD · пробел — пауза",
    swipe: "Свайп — поворот",
    pad: "Кнопки",
    signIn: "войдите, чтобы сохранить Qzr",
    synced: (n) => `+${n} Qzr за партии без входа`,
    up: "Вверх",
    down: "Вниз",
    left: "Влево",
    right: "Вправо",
    price: (qzr) => `${qzr} за кристалл, дорожает`,
    turbo: (boost, percent) => `турбо ×${boost} · +${percent}%`,
    bonuses: "Бонусы",
    nextKey: (n) => `следующий Qzr ключ через ${n}`,
    max: "Макс",
    buyFailed: "Бонус не купился",
    perks: {
      golden: { name: "Золотой кристалл", description: (n) => `Шанс ${n}%, что кристалл золотой и стоит ×5` },
      life: { name: "Вторая жизнь", description: (n) => `${n} раз за партию переживает столкновение с собой, откусив хвост` },
      slow: { name: "Медленнее разгон", description: (n) => `Змейка разгоняется на ${n}% медленнее` },
    },
    earned: (n) => `+${n} Qzr`,
    failed: "Партия не сохранилась",
    signOut: "Выйти",
  },

  units: {
    hours: "ч",
    minutes: "мин",
    bytes: ["Б", "КБ", "МБ", "ГБ", "ТБ", "ПБ"],
  },
};
