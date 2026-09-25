import type { Locale } from "@/lib/i18n";

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
  /** Flies around the profile in the RemnaWeb Mini App. */
  pinned: boolean;
  createdAt: string;
};

export type Pets = { kinds: PetKind[]; owned: OwnedPet[] };

/** Text color of each rarity; the labels are in the dictionaries (`pets.rarity`). */
export const RARITY_COLOR: Record<PetRarity, string> = {
  common: "text-muted-foreground",
  rare: "text-sky-600 dark:text-sky-400",
  epic: "text-purple-600 dark:text-purple-400",
  legendary: "text-amber-600 dark:text-amber-400",
  mythic: "text-rose-600 dark:text-rose-400",
};

/** Name and description of a pet in the current language; RemnaWeb sends both. */
export const petText = (k: PetKind, locale: Locale) =>
  locale === "ru" ? { name: k.name, description: k.description } : { name: k.nameEn, description: k.descriptionEn };

export const soldOut = (k: PetKind) => k.supply !== null && k.minted >= k.supply;

/** How many pets can fly around the profile in the Mini App at once; mirrors MAX_PINNED in RemnaWeb. */
export const MAX_PINNED = 5;
