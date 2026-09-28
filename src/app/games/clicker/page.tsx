import { connection } from "next/server";
import { Clicker } from "@/components/clicker";
import { nodeCountry } from "@/lib/country";
import { getLocale } from "next-intl/server";

export default async function Page() {
  await connection();
  const { code, name } = nodeCountry(await getLocale());
  return <Clicker code={code} name={name} />;
}
