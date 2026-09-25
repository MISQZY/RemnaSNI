import type { Dict } from "./en";
import { plural } from "./plural";

// Country names do not decline in Russian, so phrases avoid putting them after prepositions.

/** "очко / очка / очков" after an already formatted number; compact ones like 1,2M take "очков". */
const points = (n: string) => (/[^\d\s]/.test(n) ? "очков" : plural(Number(n.replace(/\D/g, "")), ["очко", "очка", "очков"]));

export const ru: Dict = {
  meta: {
    title: (country) => `Кликер флага: ${country}`,
    description: (country) => `${country}: тапайте по флагу, зарабатывайте очки, покупайте улучшения и собирайте достижения.`,
    achievements: "Достижения",
    pets: "Питомцы",
  },

  unavailable: "Игра временно недоступна. Загляните чуть позже.",

  header: {
    subtitle: "Кликер флага",
    play: "Игра",
    achievements: "Достижения",
    pets: "Питомцы",
    language: "Язык",
  },

  account: {
    signIn: "Войти",
    settings: "Настройки",
    account: "Аккаунт",
    savedLocally: "Прогресс хранится в этом браузере",
    syncNow: "Синхронизировать",
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
    points: "Очки",
    perTap: "/ тап",
    perSec: "/ сек",
    hint: "Тапайте по флагу, чтобы зарабатывать очки",
    tapFlag: (country) => `Тапнуть по флагу: ${country}`,
    totalTaps: "Всего тапов",
    totalEarned: "Всего заработано",
    welcomeBack: "С возвращением!",
    awayIncome: (n, time) => `Ваш трафик натапал ${n} ${points(n)} за ${time}.`,
  },

  traffic: {
    signIn: "Войдите через Telegram, чтобы синхронизировать прогресс и собирать питомцев.",
    checking: "Проверяем ваш трафик…",
    noVpn: () =>
      "Турбо — только для пользователей VPN: их трафик через этот сервер тапает флаг за них. Всё остальное работает и без подписки.",
    none: (_, days) =>
      `За последние ${days} ${plural(days, ["день", "дня", "дней"])} трафика через этот сервер не было. 10 ГБ, 100 ГБ и 1 ТБ дают 1, 2 и 3 автотапа в секунду.`,
    active: (bytes, _, days) =>
      [
        `${bytes} через этот сервер за ${days} ${plural(days, ["день", "дня", "дней"])} тапают флаг `,
        " в секунду, а пока страница закрыта — вполовину медленнее (до 8 ч).",
      ] as [string, string],
  },

  upgrades: {
    title: "Улучшения",
    description: "Тратьте очки, чтобы зарабатывать быстрее.",
    tabs: { tap: "Тап", luck: "Удача", boost: "Бонус" },
    reveal: (n) => `Заработайте ${n} ${points(n)}, чтобы открыть`,
    level: (n) => `Ур. ${n}`,
    maxBadge: "МАКС",
    max: "Макс",
  },

  achievements: {
    title: "Достижения",
    all: "Все",
    unlocked: "Открытые",
    locked: "Закрытые",
    noneUnlocked: "Пока ничего — пора тапать флаг.",
    allUnlocked: "Открыто всё. Впечатляет!",
    secret: "Секретное достижение",
    unlockedAt: (date) => `Открыто ${date}`,
    toast: "Достижение открыто",
  },

  pets: {
    title: "Питомцы",
    shopTitle: "Магазин питомцев",
    intro: "У каждого питомца свой номер, а самые редкие выходят ограниченной серией.",
    introSignIn: "Войдите через Telegram, чтобы завести питомца.",
    introDisabled: "Магазин откроется, когда настроят вход.",
    loading: "Загружаем магазин…",
    paidWith: "Оплата очками этой страны. Питомцы остаются с вами навсегда, даже после сброса прогресса.",
    shop: "Магазин",
    mine: "Мои питомцы",
    allAdopted: "У вас все питомцы. Вот это да!",
    noneYet: "Питомцев пока нет — они ждут в магазине.",
    pinnedHint: (pinned, max) => `Закреплённые питомцы летают вокруг вашего профиля в Telegram Mini App: ${pinned} из ${max}.`,
    pin: "Закрепить",
    unpin: "Открепить",
    pinFailed: (pet) => `Не удалось закрепить: ${pet}`,
    unpinFailed: (pet) => `Не удалось открепить: ${pet}`,
    soldOut: "Распроданы",
    adopting: "Покупаем…",
    confirm: "Купить?",
    goneAll: "Разобраны все",
    minted: (n) => `Куплено: ${n}`,
    left: (left, supply) => `Осталось ${left} из ${supply}`,
    numberSign: "№",
    serialOf: (serial, supply) => `№${serial}${supply !== null ? ` из ${supply}` : ""}`,
    buyFailed: (pet) => `Не удалось купить: ${pet}`,
    bought: (pet) => `${pet} теперь ваш!`,
    boughtHint: (serial) => `Номер ${serial}. Закрепите его в «Мои питомцы», и он будет летать вокруг профиля в Mini App.`,
    rarity: { common: "Обычный", rare: "Редкий", epic: "Эпический", legendary: "Легендарный", mythic: "Мифический" },
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
    signInToBuy: "Войдите, чтобы покупать питомцев.",
    signInToPin: "Войдите, чтобы закреплять питомцев.",
    buyFailed: "Не удалось купить питомца, попробуйте ещё раз.",
    pinFailed: "Не удалось закрепить питомца, попробуйте ещё раз.",
    serverErrors: {
      "Busy, try again": "Сервер занят, попробуйте ещё раз.",
      "No such pet": "Такого питомца нет.",
      "Not enough points": "Не хватает очков.",
      "Progress is too large": "Прогресс слишком большой.",
      "Sold out": "Распроданы.",
      "You already have this pet": "Этот питомец у вас уже есть.",
      "You can pin up to 5 pets": "Закрепить можно не больше 5 питомцев.",
    },
  },

  units: {
    hours: "ч",
    minutes: "мин",
    bytes: ["Б", "КБ", "МБ", "ГБ", "ТБ", "ПБ"],
  },
};
