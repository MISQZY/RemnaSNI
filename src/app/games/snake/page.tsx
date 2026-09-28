import { nodePage } from "@/core/page";
import { Unavailable } from "@/core/ui/unavailable";
import { loadSnakeRules } from "@/games/snake/config-server";
import { SnakeSite } from "@/games/snake/snake";

// The snake, served at / by src/proxy.ts. Its rules come from RemnaWeb with the clicker's.

export default async function SnakePage() {
  const [{ code, name, signIn }, rules] = await Promise.all([nodePage(), loadSnakeRules()]);

  // Until RemnaWeb has been reached once (or while it is too old to send them) there are no rules to play by.
  if (!rules) return <Unavailable code={code} name={name} />;
  return <SnakeSite code={code} name={name} signIn={signIn} rules={rules} />;
}
