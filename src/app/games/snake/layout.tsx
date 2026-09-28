import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMessages } from "@/core/i18n/messages";
import { I18nProvider } from "@/core/i18n/provider";
import { gameMetadata, nodePage } from "@/core/page";

// The snake: its title and messages here, the game on the page. Served at / by src/proxy.ts.

export async function generateMetadata(): Promise<Metadata> {
  const [{ name }, t] = await Promise.all([nodePage(), getTranslations("snake.meta")]);
  return gameMetadata(t("title", { country: name }), t("description", { country: name }));
}

export default async function SnakeLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await nodePage();
  return (
    <I18nProvider locale={locale} messages={pageMessages(locale, "snake")}>
      {children}
    </I18nProvider>
  );
}
