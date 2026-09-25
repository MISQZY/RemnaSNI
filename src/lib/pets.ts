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

export const RARITY: Record<PetRarity, { label: string; className: string }> = {
  common: { label: "Common", className: "text-muted-foreground" },
  rare: { label: "Rare", className: "text-sky-600 dark:text-sky-400" },
  epic: { label: "Epic", className: "text-purple-600 dark:text-purple-400" },
  legendary: { label: "Legendary", className: "text-amber-600 dark:text-amber-400" },
  mythic: { label: "Mythic", className: "text-rose-600 dark:text-rose-400" },
};

export const soldOut = (k: PetKind) => k.supply !== null && k.minted >= k.supply;

/** How many pets can fly around the profile in the Mini App at once; mirrors MAX_PINNED in RemnaWeb. */
export const MAX_PINNED = 5;
