import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/core/i18n/locales";
import { GAMES, isGame } from "@/core/games";
import { siteGames } from "@/core/server/site";

/**
 * Serves the node's games (picked in RemnaWeb, core/server/site.ts) side by side: / is the hub that lists them
 * (app/page.tsx), and each game's public paths are under /<id>, rewritten to app/games/<id>, so a page loads the
 * code of its own game only. Paths of games the node does not run are 404.
 *
 * `?lang=ru` picks the language, used by the RemnaWeb Mini App that opens the site in a frame: there the
 * `lang` cookie of a direct visit is not sent. The page renders in it right away, and a partitioned
 * cookie keeps it for the next pages inside that frame.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const lang = req.nextUrl.searchParams.get("lang");
  if (isLocale(lang)) req.cookies.set(LOCALE_COOKIE, lang);

  // "/snake/x" → the game "snake" and its route "/x"; "/snake" → its route "/".
  const [, id, ...rest] = pathname.split("/");
  const route = `/${rest.join("/")}`;

  let res: NextResponse;
  if (pathname === "/games" || pathname.startsWith("/games/")) {
    // The games' own paths are only reached through the rewrite below.
    return new NextResponse(null, { status: 404 });
  } else if (isGame(id) && (GAMES[id].routes as readonly string[]).includes(route)) {
    if (!(await siteGames()).includes(id)) return new NextResponse(null, { status: 404 });
    const url = req.nextUrl.clone();
    url.pathname = `/games/${id}${route === "/" ? "" : route}`;
    res = NextResponse.rewrite(url, { request: { headers: req.headers } });
  } else {
    res = NextResponse.next({ request: { headers: req.headers } });
  }
  if (isLocale(lang)) res.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 31536000, sameSite: "none", secure: true, partitioned: true });
  return res;
}

// robots.txt is a static file, and the container's healthcheck: it must answer whether RemnaWeb does or not.
export const config = { matcher: ["/((?!api/|_next/|flag\\.svg|robots\\.txt).*)"] };
