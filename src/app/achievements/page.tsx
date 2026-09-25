import type { Metadata } from "next";
import { Achievements } from "@/components/achievements";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.achievements };
}

export default function Page() {
  return <Achievements />;
}
