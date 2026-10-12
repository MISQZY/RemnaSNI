"use client";

import { useTranslations } from "next-intl";
import { Copy, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { verifyProof, type Proof } from "./rules";

// Provably fair decks: a fight's seed hash from its start, its seed, decks and draws once over, and the check that
// the draws are the top of the decks shuffled by that seed, made right here in the browser (rules.ts verifyProof).

const checked = new Map<string, boolean | null>();

function useVerified(id: string, proof: Proof): boolean | null | undefined {
  const [, setDone] = useState(0);
  const key = `${id}:${proof.seed}`;
  useEffect(() => {
    if (!proof.seed || checked.has(key)) return;
    let live = true;
    void verifyProof(proof)
      .catch(() => null)
      .then((ok) => {
        checked.set(key, ok);
        if (live) setDone((n) => n + 1);
      });
    return () => {
      live = false;
    };
  }, [key, proof]);
  return proof.seed ? checked.get(key) : undefined;
}

function Field({ label, value, pending }: { label: string; value: string | null; pending: string }) {
  const t = useTranslations("sacrifice.fair");
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {value ? (
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard?.writeText(value).then(
              () => toast(t("copied")),
              () => {},
            )
          }
          className="flex w-full items-start gap-1.5 rounded-lg bg-muted px-2 py-1.5 text-left font-mono text-[0.6875rem] leading-snug break-all hover:bg-muted/70"
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
  const ok = useVerified(id, proof);
  const Icon = ok === true ? ShieldCheck : ok === false ? ShieldAlert : ShieldQuestion;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("check")}
          title={t("check")}
          className={cn(
            "rounded-lg p-1 text-muted-foreground outline-none hover:bg-muted/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            ok === true && "text-emerald-500 hover:text-emerald-500",
            ok === false && "text-destructive hover:text-destructive",
          )}
        >
          <Icon className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 p-3 text-sm">
        <p className="font-semibold">{t("title")}</p>
        <Field label={t("hash")} value={proof.hash} pending="" />
        <Field label={t("seed")} value={proof.seed} pending={t("seedLater")} />
        {ok !== undefined && (
          <p className={cn("inline-flex items-center gap-1 text-xs font-medium", ok ? "text-emerald-600 dark:text-emerald-400" : ok === false ? "text-destructive" : "text-muted-foreground")}>
            <Icon className="size-4" /> {ok ? t("verified") : ok === false ? t("mismatch") : t("unchecked")}
          </p>
        )}
        <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          <p>{t("how")}</p>
          <ScrollArea scrollbars="horizontal" className="rounded-lg bg-muted">
            <pre className="px-2 py-1.5 font-mono text-[0.6875rem] leading-relaxed text-foreground">
              <code>{FORMULA}</code>
            </pre>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
