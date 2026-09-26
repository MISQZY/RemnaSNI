import type { Locale } from "@/lib/i18n";

// Pets bought in the shop. The catalog, prices, serial numbers and the upgrader live in RemnaWeb
// (lib/pets.ts there); these types mirror its PetKindDto / PetDto / PetRarityDto.

export type PetRarity = "common" | "rare" | "epic" | "legendary" | "mythic" | "cosmic";

/** Rarities from the lowest; the upgrader moves a pet one step up. */
export const RARITIES: PetRarity[] = ["common", "rare", "epic", "legendary", "mythic", "cosmic"];

export type PetKind = {
  id: string;
  emoji: string;
  /** The rarity the shop sells it at; upgrades go higher. */
  rarity: PetRarity;
  anim: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  /** Points of the country the pet is bought in. */
  price: number;
  /** Size of the shop's series (the kind at its own rarity); null when unlimited. */
  supply: number | null;
  /** How many of the shop's series exist now. */
  minted: number;
};

export type OwnedPet = {
  id: number;
  kind: string;
  rarity: PetRarity;
  /** Number within the series of its kind and rarity, starting at 1. */
  serial: number;
  /** Size of that series; null when unlimited. */
  supply: number | null;
  /** Country whose points paid for it. */
  country: string;
  /** Flies around the profile in the RemnaWeb Mini App. */
  pinned: boolean;
  createdAt: string;
  /** Set while the pet is on sale on the Mini App market. */
  listing?: { id: number; price: number } | null;
};

/** A rarity: series size and the chance to upgrade a pet of it to the next (0 at the top). */
export type Rarity = { id: PetRarity; supply: number | null; chance: number };

export type Pets = { kinds: PetKind[]; owned: OwnedPet[]; rarities?: Rarity[] };

/** Text color of each rarity; the labels are in the dictionaries (`pets.rarity`). */
export const RARITY_COLOR: Record<PetRarity, string> = {
  common: "text-muted-foreground",
  rare: "text-sky-600 dark:text-sky-400",
  epic: "text-purple-600 dark:text-purple-400",
  legendary: "text-amber-600 dark:text-amber-400",
  mythic: "text-rose-600 dark:text-rose-400",
  cosmic: "text-cyan-600 dark:text-cyan-300",
};

/** Name and description of a pet in the current language; RemnaWeb sends both. */
export const petText = (k: PetKind, locale: Locale) =>
  locale === "ru" ? { name: k.name, description: k.description } : { name: k.nameEn, description: k.descriptionEn };

export const soldOut = (k: PetKind) => k.supply !== null && k.minted >= k.supply;

export const nextRarity = (r: PetRarity): PetRarity | null => RARITIES[RARITIES.indexOf(r) + 1] ?? null;

/** Look of a pet for the sprite: the kind's emoji and animation, the pet's own rarity. */
export const petLook = (k: PetKind, rarity: PetRarity, id: string | number) => ({ id: `${k.id}-${id}`, emoji: k.emoji, anim: k.anim, rarity });
