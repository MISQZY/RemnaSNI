"use client";

import { useTranslations } from "next-intl";
import { Copy, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { TIER_CHIP, useMultiplier } from "./chart";
import { tierOf, verifyRound, type CrashRound, type CrashRules } from "./rules";

// Provably fair: every round's seed hash from its start, its seed once it has crashed, and the check of the two
// against its crash point, made right here in the browser (rules.ts verifyRound).

/** A round as far as it is known: the seed and the crash point come once it has crashed. */
export type RoundProofData = { id: number; hash: string; seed: string | null; crash: number | null };

/** Checks done on this page, by round: a crashed round never changes. */
const checked = new Map<number, boolean | null>();

/** Whether the crashed round checks out; undefined while checking or before the crash, null when it cannot be checked. */
function useVerified(rules: CrashRules, round: RoundProofData): boolean | null | undefined {
  const [, setDone] = useState(0);
  const ready = round.seed !== null && round.crash !== null;
  useEffect(() => {
    if (!ready || checked.has(round.id)) return;
    let live = true;
    void verifyRound(rules, round as CrashRound)
      .catch(() => null)
      .then((ok) => {
        checked.set(round.id, ok);
        if (live) setDone((n) => n + 1);
      });
    return () => {
      live = false;
    };
  }, [rules, round, ready]);
  return ready ? checked.get(round.id) : undefined;
}

function copy(text: string, done: string) {
  void navigator.clipboard?.writeText(text).then(
    () => toast(done),
    () => {},
  );
}

function Field({ label, value, pending }: { label: string; value: string | null; pending: string }) {
  const t = useTranslations("crash.fair");
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {value ? (
        <button
          type="button"
          onClick={() => copy(value, t("copied"))}
          className="flex w-full items-start gap-1.5 rounded-lg bg-muted px-2 py-1.5 text-left font-mono text-[11px] leading-snug break-all hover:bg-muted/70"
        >
          <span className="min-w-0 flex-1">{value}</span>
          <Copy className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <p className="rounded-lg bg-muted px-2 py-1.5 text-xs text-muted-foreground">{pending}</p>
      )}
    </div>
  );
}

/** The verdict of the check, as an icon and a word. */
function Verdict({ ok }: { ok: boolean | null | undefined }) {
  const t = useTranslations("crash.fair");
  if (ok === undefined) return null;
  if (ok === null)
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <ShieldQuestion className="size-4" /> {t("unchecked")}
      </span>
    );
  return ok ? (
    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
      <ShieldCheck className="size-4" /> {t("verified")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-destructive">
      <ShieldAlert className="size-4" /> {t("mismatch")}
    </span>
  );
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
        <Field label={t("hash")} value={round.hash} pending="" />
        <Field label={t("seed")} value={round.seed} pending={t("seedLater")} />
        <div className="text-xs font-medium">
          <Verdict ok={ok} />
        </div>
        <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          <p>{t("how")}</p>
          <ScrollArea scrollbars="horizontal" className="rounded-lg bg-muted">
            <pre className="px-2 py-1.5 font-mono text-[11px] leading-relaxed text-foreground">
              <code>{formula(rules)}</code>
            </pre>
          </ScrollArea>
          <p>{t("bounds", { max: mult(rules.maxCrash) })}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Under the chart: the icon of the round on, which opens its proof; green once it has crashed and checked out. */
export function CurrentRoundProof({ rules, round }: { rules: CrashRules; round: RoundProofData | null }) {
  const t = useTranslations("crash.fair");
  const ok = useVerified(rules, round ?? { id: 0, hash: "", seed: null, crash: null });
  if (!round) return null;
  const Icon = ok === true ? ShieldCheck : ok === false ? ShieldAlert : ShieldQuestion;
  return (
    <RoundProof rules={rules} round={round} align="end">
      <button
        type="button"
        aria-label={t("check")}
        title={t("check")}
        className={cn(
          "self-end rounded-lg p-1 text-muted-foreground outline-none hover:bg-muted/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          ok === true && "text-emerald-500 hover:text-emerald-500",
          ok === false && "text-destructive hover:text-destructive",
        )}
      >
        <Icon className="size-4" />
      </button>
    </RoundProof>
  );
}
