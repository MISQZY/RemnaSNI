import { nodePage } from "@/core/page";
import { Clicker } from "@/games/clicker/clicker";

export default async function Page() {
  const { code, name } = await nodePage();
  return <Clicker code={code} name={name} />;
}
