// English interface strings; this dictionary defines the shape every other language must match.
// Numbers arrive already formatted for the language.

export const en = {
  meta: {
    title: (country: string) => `${country} Flag Clicker`,
    description: (country: string) => `Tap the flag of ${country}, earn points, buy upgrades and collect achievements.`,
    achievements: "Achievements",
    pets: "Pets",
  },

  unavailable: "The game is temporarily unavailable. Please come back a bit later.",

  header: {
    subtitle: "Flag Clicker",
    play: "Play",
    achievements: "Achievements",
    pets: "Pets",
    language: "Language",
  },

  account: {
    signIn: "Sign in",
    settings: "Settings",
    account: "Account",
    savedLocally: "Progress is saved in this browser",
    syncNow: "Sync now",
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
    points: "Points",
    perTap: "/ tap",
    perSec: "/ sec",
    hint: "Tap the flag to earn points",
    tapFlag: (country: string) => `Tap the flag of ${country}`,
    totalTaps: "Total taps",
    totalEarned: "Total earned",
    welcomeBack: "Welcome back!",
    awayIncome: (points: string, time: string) => `Your traffic auto-tapped ${points} points in ${time}.`,
  },

  traffic: {
    signIn: "Sign in with Telegram to sync progress and collect pets.",
    checking: "Checking your traffic…",
    noVpn: (country: string) =>
      `The turbo is for VPN users only: their traffic through ${country} taps the flag for them. Everything else works without a subscription.`,
    none: (country: string, days: number) =>
      `No traffic through ${country} in the last ${days} days. 10 GB, 100 GB and 1 TB unlock 1, 2 and 3 auto-taps per second.`,
    /** `boost` goes in between, highlighted. */
    active: (bytes: string, country: string, days: number) =>
      [`${bytes} through ${country} in ${days} days taps the flag `, " per second, at half speed while the page is closed (up to 8 h)."] as [string, string],
  },

  upgrades: {
    title: "Upgrades",
    description: "Spend points to earn them faster.",
    tabs: { tap: "Tap", luck: "Luck", boost: "Boost" },
    reveal: (points: string) => `Earn ${points} points to reveal`,
    level: (n: number) => `Lv ${n}`,
    maxBadge: "MAX",
    max: "Max",
  },

  achievements: {
    title: "Achievements",
    all: "All",
    unlocked: "Unlocked",
    locked: "Locked",
    noneUnlocked: "Nothing yet — go tap that flag.",
    allUnlocked: "Everything is unlocked. Impressive!",
    secret: "Secret achievement",
    unlockedAt: (date: string) => `Unlocked ${date}`,
    toast: "Achievement unlocked",
  },

  pets: {
    title: "Pets",
    shopTitle: "Pet shop",
    intro: "Every pet gets its own serial number, and the rarest come in limited series.",
    introSignIn: "Sign in with Telegram to adopt one.",
    introDisabled: "The shop opens once sign-in is set up.",
    loading: "Loading the shop…",
    paidWith: "Paid with this country's points. Pets are yours for good: they stay even if you reset progress.",
    shop: "Shop",
    mine: "My pets",
    allAdopted: "You have adopted every pet. Wow!",
    noneYet: "No pets yet, they are waiting in the shop.",
    pinnedHint: (pinned: number, max: number) => `Pinned pets fly around your profile in the Telegram Mini App: ${pinned} of ${max}.`,
    pin: "Pin to profile",
    unpin: "Unpin",
    pinFailed: (pet: string) => `Could not pin ${pet}`,
    unpinFailed: (pet: string) => `Could not unpin ${pet}`,
    soldOut: "Sold out",
    adopting: "Adopting…",
    confirm: "Adopt?",
    goneAll: "All adopted",
    minted: (n: string) => `${n} adopted`,
    left: (left: string, supply: string) => `${left} of ${supply} left`,
    numberSign: "#",
    serialOf: (serial: number, supply: number | null) => `#${serial}${supply !== null ? ` of ${supply}` : ""}`,
    buyFailed: (pet: string) => `Could not adopt ${pet}`,
    bought: (pet: string) => `${pet} is yours!`,
    boughtHint: (serial: string) => `Serial ${serial}. Pin it in My pets to have it fly around your profile in the Mini App.`,
    rarity: { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary", mythic: "Mythic" },
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
    signInToBuy: "Sign in to buy pets.",
    signInToPin: "Sign in to pin pets.",
    buyFailed: "Could not buy the pet, try again.",
    pinFailed: "Could not pin the pet, try again.",
    /** RemnaWeb answers in English; other languages translate the messages they know. */
    serverErrors: {} as Record<string, string>,
  },

  units: {
    hours: "h",
    minutes: "m",
    bytes: ["B", "KB", "MB", "GB", "TB", "PB"],
  },
};

export type Dict = typeof en;
