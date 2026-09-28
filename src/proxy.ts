import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/core/i18n/locales";
import { siteGame, type GameId } from "@/core/site";

/** Public paths of each game; the pages live under app/games/<id>. */
const ROUTES: Record<GameId, string[]> = {
  clicker: ["/"],
  snake: ["/"],
};

/**
 * Serves the node's game (picked in RemnaWeb, lib/site-game.ts) at its public paths by rewriting them to
 * app/games/<id>, so each node loads the code of its own game only; paths of other games are 404.
 *
 * `?lang=ru` picks the language, used by the RemnaWeb Mini App that opens the site in a frame: there the
 * `lang` cookie of a direct visit is not sent. The page renders in it right away, and a partitioned
 * cookie keeps it for the next pages inside that frame.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const game = await siteGame();
  const lang = req.nextUrl.searchParams.get("lang");
  if (isLocale(lang)) req.cookies.set(LOCALE_COOKIE, lang);

  let res: NextResponse;
  if (ROUTES[game].includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/games/${game}${pathname === "/" ? "" : pathname}`;
    res = NextResponse.rewrite(url, { request: { headers: req.headers } });
  } else if (pathname === "/games" || pathname.startsWith("/games/")) {
    // The games' own paths are only reached through the rewrite above.
    return new NextResponse(null, { status: 404 });
  } else {
    res = NextResponse.next({ request: { headers: req.headers } });
  }
  if (isLocale(lang)) res.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 31536000, sameSite: "none", secure: true, partitioned: true });
  return res;
}

export const config = { matcher: ["/((?!api/|_next/|flag\\.svg).*)"] };
