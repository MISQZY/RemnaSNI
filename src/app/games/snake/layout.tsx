import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { gameMetadata, nodePage } from "@/core/page";

// The snake: its title here, the game on the page. Served at / by src/proxy.ts.

export async function generateMetadata(): Promise<Metadata> {
  const [{ name }, t] = await Promise.all([nodePage(), getTranslations("snake.meta")]);
  return gameMetadata(t("title", { country: name }), t("description", { country: name }));
}

export default function SnakeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
