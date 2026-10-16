"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProofFormula, ProofIcon, ProofSeeds, ProofVerdict, useProofCheck } from "@/core/ui/fairness";
import { cn } from "@/lib/utils";
import { TIER_CHIP, useMultiplier } from "./chart";
import { tierOf, verifyRound, type CrashRound, type CrashRules } from "./rules";

// Provably fair (core/ui/fairness.tsx): every round's seed hash from its start, its seed once it has crashed, and the
// check of the two against its crash point, made right here in the browser (rules.ts verifyRound).

/** A round as far as it is known: the seed and the crash point come once it has crashed. */
export type RoundProofData = { id: number; hash: string; seed: string | null; crash: number | null };

/** Whether the crashed round checks out; undefined while checking or before the crash, null when it cannot be checked. */
function useVerified(rules: CrashRules, round: RoundProofData | null): boolean | null | undefined {
  const ready = round !== null && round.seed !== null && round.crash !== null;
  return useProofCheck(ready ? `crash:${round.id}` : null, () => verifyRound(rules, round as CrashRound));
}

/**
 * How to get the crash point by hand, as rules.ts and RemnaWeb's crashPoint do: in hundredths it is
 * ⌊100 × (1 − edge) / (1 − u)⌋, so the multiplier is that over 100. Code rather than words, the same in every language.
 */
function formula(rules: Pick<CrashRules, "edge">): string {
  // At most four decimals, so 2.5% edge gives 97.5 rather than 97.49999999999999.
  const k = Number((100 * (1 - rules.edge)).toFixed(4));
  return [
    "hash  = SHA256(seed)",
    'h     = HMAC_SHA256(key: seed, msg: "crash")',
    "u     = int(h[0:13], 16) / 2^52",
    `crash = ⌊${k} / (1 − u)⌋ / 100`,
  ].join("\n");
}

/** A round's hash and seed, the check, and how to make it by hand; opened by `children`. */
export function RoundProof({ rules, round, children, align = "start" }: { rules: CrashRules; round: RoundProofData; children: ReactNode; align?: "start" | "center" | "end" }) {
  const t = useTranslations("crash.fair");
  const mult = useMultiplier();
  const ok = useVerified(rules, round);
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-80 space-y-3 p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{t("round", { id: round.id })}</p>
          {round.crash !== null && (
            <span className={cn("rounded-full px-2 text-xs font-semibold tabular-nums", TIER_CHIP[tierOf(rules, round.crash)])}>{mult(round.crash)}</span>
          )}
        </div>
        <ProofSeeds hash={round.hash} seed={round.seed} seedLater={t("seedLater")} />
        <ProofVerdict ok={ok} verified={t("verified")} />
        <ProofFormula how={t("how")} code={formula(rules)} notes={t("bounds", { max: mult(rules.maxCrash) })} />
      </PopoverContent>
    </Popover>
  );
}

/** Under the chart: the icon of the round on, which opens its proof; green once it has crashed and checked out. */
export function CurrentRoundProof({ rules, round }: { rules: CrashRules; round: RoundProofData | null }) {
  const t = useTranslations("crash.fair");
  const ok = useVerified(rules, round);
  if (!round) return null;
  return (
    <RoundProof rules={rules} round={round} align="end">
      <ProofIcon ok={ok} label={t("check")} className="self-end" />
    </RoundProof>
  );
}
