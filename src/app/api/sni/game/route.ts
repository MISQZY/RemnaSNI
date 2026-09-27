import { connection } from "next/server";
import { siteGame } from "@/lib/site-game";

// Which game this node runs, for RemnaWeb's game list. Answered by the site itself, not passed on to
// RemnaWeb like the other /api/sni calls ([...path]); a static route wins over the catch-all.

export async function GET() {
  // GAME comes from the container at request time, not from the build.
  await connection();
  return Response.json({ game: siteGame() }, { headers: { "Cache-Control": "no-store" } });
}
