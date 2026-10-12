import { nodePage } from "@/core/page";
import { Unavailable } from "@/core/ui/unavailable";
import { loadSacrificeRules } from "@/games/sacrifice/config-server";
import { SacrificeSite } from "@/games/sacrifice/sacrifice";

// The Sacrifice, served at / by src/proxy.ts. Its rules and cards come from RemnaWeb with the other games', the duels
// through the stream, the fights against the robot and the deck from RemnaWeb's calls.

export default async function SacrificePage() {
  const [{ code, name, signIn }, rules] = await Promise.all([nodePage(), loadSacrificeRules()]);

  // Until RemnaWeb has been reached once (or while it is too old to send them) there are no rules to play by.
  if (!rules) return <Unavailable code={code} name={name} />;
  return <SacrificeSite code={code} name={name} signIn={signIn} rules={rules} />;
}
