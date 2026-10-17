"use client";

import { useTranslations } from "next-intl";
import { Copy, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { useEffect, useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Provably fair, the parts every game that rolls on RemnaWeb's side shows the same way (the crash's rounds, the
// Sacrifice's decks): a hash from the start, the seed once it is over, the check of the two made right here in the
// browser, and how to make it by hand. Each game brings its own check and formula, and the words that name its subject.

/** Checks done on this page, by key: what is over never changes. */
const checked = new Map<string, boolean | null>();

/**
 * Whether what `key` names checks out: undefined while checking or before it can be (`key` null), null when the browser
 * cannot check it. `verify` runs once per key.
 */
export function useProofCheck(key: string | null, verify: () => Promise<boolean | null>): boolean | null | undefined {
  const [, setDone] = useState(0);
  useEffect(() => {
    if (key === null || checked.has(key)) return;
    let live = true;
    void verify()
      .catch(() => null)
      .then((ok) => {
        checked.set(key, ok);
        if (live) setDone((n) => n + 1);
      });
    return () => {
      live = false;
    };
    // `verify` checks what `key` names: a new key, a new check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return key === null ? undefined : checked.get(key);
}

/** The shield of a verdict: checked, failed, or not known. */
function Shield({ ok }: { ok: boolean | null | undefined }) {
  if (ok === true) return <ShieldCheck className="size-4" />;
  if (ok === false) return <ShieldAlert className="size-4" />;
  return <ShieldQuestion className="size-4" />;
}

/** A hash or a seed, copied on a tap; `pending` while it is not known yet. */
export function ProofField({ label, value, pending = "" }: { label: string; value: string | null; pending?: string }) {
  const t = useTranslations("fair");
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
          className="flex w-full items-start gap-1.5 rounded-lg bg-muted px-2 py-1.5 text-left font-mono text-2xs leading-snug break-all hover:bg-muted/70"
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

/** The hash and the seed of a proof. */
export function ProofSeeds({ hash, seed, seedLater }: { hash: string; seed: string | null; seedLater: string }) {
  const t = useTranslations("fair");
  return (
    <>
      <ProofField label={t("hash")} value={hash} />
      <ProofField label={t("seed")} value={seed} pending={seedLater} />
    </>
  );
}

/** The verdict of the check, as an icon and a word: `verified` names what matched. Nothing before it can be made. */
export function ProofVerdict({ ok, verified }: { ok: boolean | null | undefined; verified: string }) {
  const t = useTranslations("fair");
  if (ok === undefined) return null;
  return (
    <p className={cn("inline-flex items-center gap-1 text-xs font-medium", ok ? "text-emerald-600 dark:text-emerald-400" : ok === false ? "text-destructive" : "text-muted-foreground")}>
      <Shield ok={ok} /> {ok ? verified : ok === false ? t("mismatch") : t("unchecked")}
    </p>
  );
}

/** How to make the check by hand: `how` in words, then `code`, the same in every language, and any `notes` after. */
export function ProofFormula({ how, code, notes }: { how: string; code: string; notes?: string }) {
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
      <p>{how}</p>
      <ScrollArea scrollbars="horizontal" className="rounded-lg bg-muted">
        <pre className="px-2 py-1.5 font-mono text-2xs leading-relaxed text-foreground">
          <code>{code}</code>
        </pre>
      </ScrollArea>
      {notes && <p>{notes}</p>}
    </div>
  );
}

/** The icon that opens a proof: green once it has checked out, red when it did not. */
export function ProofIcon({ ok, label, className, ...props }: { ok: boolean | null | undefined; label: string } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "rounded-lg p-1 text-muted-foreground outline-none hover:bg-muted/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        ok === true && "text-emerald-500 hover:text-emerald-500",
        ok === false && "text-destructive hover:text-destructive",
        className,
      )}
      {...props}
    >
      <Shield ok={ok} />
    </button>
  );
}
