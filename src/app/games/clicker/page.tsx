import { connection } from "next/server";
import { Clicker } from "@/games/clicker/clicker";
import { siteCountry } from "@/core/country";
import { getLocale } from "next-intl/server";

export default async function Page() {
  await connection();
  const { code, name } = await siteCountry(await getLocale());
  return <Clicker code={code} name={name} />;
}
