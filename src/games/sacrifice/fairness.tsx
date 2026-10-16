"use client";

import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProofFormula, ProofIcon, ProofSeeds, ProofVerdict, useProofCheck } from "@/core/ui/fairness";
import { verifyProof, type Proof } from "./rules";

// Provably fair decks (core/ui/fairness.tsx): a fight's seed hash from its start, its seed, decks and draws once over,
// and the check that the draws are the top of the decks shuffled by that seed, made right here in the browser
// (rules.ts verifyProof).

const FORMULA = [
  "hash = SHA256(seed)",
  "for side s, deck = the deck as built",
  "for i = len(deck) − 1 … 1:",
  '  h = HMAC_SHA256(key: seed, msg: "deck:" + s + ":" + i)',
  "  j = ⌊int(h[0:13], 16) / 2^52 × (i + 1)⌋",
  "  swap deck[i], deck[j]",
].join("\n");

/** The icon of a fight's check, which opens its hash, seed and how to check it. */
export function ProofButton({ id, proof }: { id: string; proof: Proof }) {
  const t = useTranslations("sacrifice.fair");
  const ok = useProofCheck(proof.seed ? `sacrifice:${id}:${proof.seed}` : null, () => verifyProof(proof));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ProofIcon ok={ok} label={t("check")} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 p-3 text-sm">
        <p className="font-semibold">{t("title")}</p>
        <ProofSeeds hash={proof.hash} seed={proof.seed} seedLater={t("seedLater")} />
        <ProofVerdict ok={ok} verified={t("verified")} />
        <ProofFormula how={t("how")} code={FORMULA} />
      </PopoverContent>
    </Popover>
  );
}
