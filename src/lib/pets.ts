// Pets bought in the shop. The catalog, prices and serial numbers live in RemnaWeb (lib/pets.ts there);
// these types mirror its PetKindDto / PetDto.

export type PetRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type PetKind = {
  id: string;
  emoji: string;
  rarity: PetRarity;
  anim: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  /** Points of the country the pet is bought in. */
  price: number;
  /** Size of the limited series; null when unlimited. */
  supply: number | null;
  /** How many have been bought by everyone. */
  minted: number;
};

export type OwnedPet = {
  kind: string;
  /** Number within the kind's series, starting at 1. */
  serial: number;
  /** Country whose points paid for it. */
  country: string;
  createdAt: string;
};

export type Pets = { kinds: PetKind[]; owned: OwnedPet[] };

export const RARITY: Record<PetRarity, { label: string; className: string }> = {
  common: { label: "Common", className: "text-muted-foreground" },
  rare: { label: "Rare", className: "text-sky-600 dark:text-sky-400" },
  epic: { label: "Epic", className: "text-purple-600 dark:text-purple-400" },
  legendary: { label: "Legendary", className: "text-amber-600 dark:text-amber-400" },
  mythic: { label: "Mythic", className: "text-rose-600 dark:text-rose-400" },
};

export const soldOut = (k: PetKind) => k.supply !== null && k.minted >= k.supply;

// The companion shown next to the flag, remembered per browser.

const COMPANION_KEY = "remnasni:companion";
const listeners = new Set<() => void>();

export const companion = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): string | null {
    try {
      return localStorage.getItem(COMPANION_KEY);
    } catch {
      return null;
    }
  },
  getServerSnapshot: () => null,
  /** Shows an owned pet next to the flag; `null` hides the companion. */
  set(kind: string | null) {
    try {
      localStorage.setItem(COMPANION_KEY, kind ?? "none");
    } catch {
      // Not remembered: the latest pet keeps showing.
    }
    listeners.forEach((l) => l());
  },
};

/** The companion to show: the chosen owned pet, else the latest one, unless hidden. */
export function pickCompanion(pets: Pets | null, choice: string | null): PetKind | null {
  if (!pets?.owned.length || choice === "none") return null;
  const kind = pets.owned.some((p) => p.kind === choice) ? choice : pets.owned.at(-1)!.kind;
  return pets.kinds.find((k) => k.id === kind) ?? null;
}
