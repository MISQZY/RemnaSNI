import { getTranslations } from "next-intl/server";

/** The page of a game whose rules have not come from RemnaWeb yet: nothing to play by. */
export async function Unavailable({ code, name }: { code: string; name: string }) {
  const t = await getTranslations();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <span className={`fi fi-${code} rounded-md text-7xl shadow-md`} />
      <h1 className="text-xl font-semibold">{name}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t("unavailable")}</p>
    </main>
  );
}
