import { connection } from "next/server";
import { Clicker } from "@/components/clicker";
import { nodeCountry } from "@/lib/country";

export default async function Page() {
  await connection();
  const { code, name } = nodeCountry();
  return <Clicker code={code} name={name} />;
}
