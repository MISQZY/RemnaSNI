// English interface strings; this dictionary defines the shape every other language must match.
// Numbers arrive already formatted for the language.

export const en = {
  meta: {
    title: (country: string) => `${country} Flag Clicker`,
    description: (country: string) => `Tap the flag of ${country}, earn Qzr, buy upgrades and climb through prestiges.`,
  },

  unavailable: "The game is temporarily unavailable. Please come back a bit later.",

  header: {
    subtitle: "Flag Clicker",
    language: "Language",
  },

  account: {
    signIn: "Sign in",
    settings: "Settings",
    account: "Account",
    savedLocally: "Progress is saved in this browser",
    syncNow: "Sync now",
    signOutEverywhere: "Sign out on all devices",
    signOut: "Sign out",
    idle: "Progress is synced to your account",
    syncing: "Syncing…",
    synced: (time: string) => `Synced at ${time}`,
    offline: "Offline, will retry",
    reset: "Reset progress",
    resetConfirm: "Click again to reset",
    resetDone: "Progress reset",
  },

  clicker: {
    points: "Qzyrium",
    perTap: "/ tap",
    perSec: "/ sec",
    hint: "Tap the flag to earn Qzr",
    tapFlag: (country: string) => `Tap the flag of ${country}`,
    totalTaps: "Total taps",
    totalEarned: "Total earned",
    welcomeBack: "Welcome back!",
    awayIncome: (points: string, time: string) => `The turbo auto-tapped ${points} Qzr in ${time}.`,
  },

  traffic: {
    signIn: "Sign in with Telegram to sync progress.",
    checking: "Checking your turbo…",
    unavailable: (country: string) => `The turbo is not available to this account in ${country}. Everything else works without it.`,
    none: (country: string, days: number) => `No turbo activity in ${country} in the last ${days} days.`,
    /** `boost` goes in between, highlighted. */
    active: (_bytes: string, country: string, days: number) =>
      [`Your activity in ${country} over ${days} days taps the flag `, " per second, at half speed while the page is closed (up to 8 h)."] as [string, string],
    /** The turbo bought for Qzr is the one at work; `boost` goes in between, highlighted. */
    bought: () => ["The turbo bought for Qzr taps the flag ", " per second, at half speed while the page is closed (up to 8 h)."] as [string, string],
  },

  upgrades: {
    title: "Upgrades",
    description: "Spend Qzr to earn it faster.",
    tabs: { tap: "Tap", luck: "Luck", boost: "Boost" },
    reveal: (points: string) => `Earn ${points} Qzr to reveal`,
    level: (n: number) => `Lv ${n}`,
    maxBadge: "MAX",
    max: "Max",
  },

  prestige: {
    title: "Prestige",
    description: (percent: number) =>
      `Qzr and upgrades are reset, and you get Qzr keys in return: each one adds +${percent}% to income for good. Everything else stays.`,
    keys: "Qzr keys",
    free: (n: string) => `${n} free`,
    bonus: "Income bonus",
    nextKey: "Next Qzr key",
    move: (keys: string, n: number) => `Prestige: +${keys} ${n === 1 ? "Qzr key" : "Qzr keys"}`,
    nothing: "Not enough for a Qzr key yet",
    confirm: "Click again: Qzr will be gone",
    done: "Prestige done!",
    doneHint: (keys: string, n: number, mult: string) => `+${keys} ${n === 1 ? "Qzr key" : "Qzr keys"}. Income is now ×${mult}.`,
    perks: "Qzr key perks",
  },

  human: {
    title: "Check: tap the",
    missed: "Not that one, try again.",
    notCounted: "Taps do not count until the check is passed.",
    blocked: (time: string) => `Too many misses. Next check in ${time}`,
    loading: "Loading the check…",
    retry: "Retry",
    failed: "Could not load the check",
  },

  sync: {
    signInFailed: "Could not sign in",
    tryLater: "Please try again later.",
    signInErrors: {
      disabled: "Sign-in is not configured yet.",
      cancelled: "Sign-in was cancelled.",
      access_denied: "Sign-in was cancelled.",
      blocked: "This account is blocked.",
    } as Record<string, string>,
    signedOut: "Signed out",
    expiredSync: "Your session has expired, sign in again to keep syncing.",
    expired: "Your session has expired, sign in again.",
    offline: "No connection, try again.",
    /** RemnaWeb answers in English; other languages translate the messages they know. */
    serverErrors: {} as Record<string, string>,
  },

  snake: {
    title: (country: string) => `${country} Snake`,
    description: (country: string) => `Snake on the ${country} node: eat crystals, grow and earn Qzr.`,
    subtitle: "Snake",
    score: "Score",
    best: "Best",
    balance: "Qzr balance",
    play: "Play",
    again: "Play again",
    resume: "Resume",
    paused: "Paused",
    over: "Game over",
    hint: "Arrows or WASD · Space pauses",
    swipe: "Swipe to turn",
    pad: "Buttons",
    signIn: "sign in to keep Qzr",
    synced: (n: string) => `+${n} Qzr from runs played without sign-in`,
    up: "Up",
    down: "Down",
    left: "Left",
    right: "Right",
    price: (qzr: string) => `${qzr} per crystal, growing`,
    turbo: (boost: string, percent: string) => `turbo ×${boost} · +${percent}%`,
    bonuses: "Bonuses",
    nextKey: (n: string) => `next Qzr key in ${n}`,
    max: "Max",
    buyFailed: "Could not buy the bonus",
    perks: {
      golden: { name: "Golden crystal", description: (n: string) => `${n}% chance a crystal is golden and worth ×5` },
      life: { name: "Second life", description: (n: string) => `Survive hitting yourself ${n}× a run, biting your tail off` },
      slow: { name: "Slower speed-up", description: (n: string) => `The snake speeds up ${n}% slower` },
    },
    earned: (n: string) => `+${n} Qzr`,
    failed: "The run was not saved",
    signOut: "Sign out",
  },

  units: {
    hours: "h",
    minutes: "m",
    bytes: ["B", "KB", "MB", "GB", "TB", "PB"],
  },
};

export type Dict = typeof en;
