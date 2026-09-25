import type { Metadata } from "next";
import { PetShop } from "@/components/pet-shop";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.pets };
}

export default function Page() {
  return <PetShop />;
}
