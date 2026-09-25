import type { Metadata } from "next";
import { PetShop } from "@/components/pet-shop";

export const metadata: Metadata = { title: "Pets" };

export default function Page() {
  return <PetShop />;
}
