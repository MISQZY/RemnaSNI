import { nodePage } from "@/core/page";
import { Unavailable } from "@/core/ui/unavailable";
import { loadFishingRules } from "@/games/fishing/config-server";
import { FishingSite } from "@/games/fishing/fishing";

// The fishing, served at / by src/proxy.ts. Its rules come from RemnaWeb with the other games'.

export default async function FishingPage() {
  const [{ code, name, signIn }, rules] = await Promise.all([nodePage(), loadFishingRules()]);

  // Until RemnaWeb has been reached once (or while it is too old to send them) there are no rules to play by.
  if (!rules) return <Unavailable code={code} name={name} />;
  return <FishingSite code={code} name={name} signIn={signIn} rules={rules} />;
}
