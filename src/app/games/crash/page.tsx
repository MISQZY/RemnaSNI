import { nodePage } from "@/core/page";
import { Unavailable } from "@/core/ui/unavailable";
import { loadCrashRules } from "@/games/crash/config-server";
import { CrashSite } from "@/games/crash/crash";

// The crash, served at / by src/proxy.ts. Its rules come from RemnaWeb with the other games', its rounds through
// the stream.

export default async function CrashPage() {
  const [{ code, name, signIn }, rules] = await Promise.all([nodePage(), loadCrashRules()]);

  // Until RemnaWeb has been reached once (or while it is too old to send them) there are no rules to play by.
  if (!rules) return <Unavailable code={code} name={name} />;
  return <CrashSite code={code} name={name} signIn={signIn} rules={rules} />;
}
