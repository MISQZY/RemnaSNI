import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, isLocale } from "@/core/i18n/locales";
import { CORE_API, GAMES } from "@/core/games";
import { remnaWebUrl } from "@/core/remnaweb";
import { SITE_HEADER, siteGame, siteHost } from "@/core/site";

// RemnaWeb's SNI API behind this site's own origin: the page never names RemnaWeb, so a visitor or a
// probe sees a standalone game. Only the calls of the session and of the node's game (core/games.ts) are
// passed through.

const MAX_BODY_BYTES = 64 * 1024;
const TIMEOUT_MS = 10_000;

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(req: Request, { params }: Ctx): Promise<Response> {
  const path = (await params).path.join("/");
  const base = remnaWebUrl();
  if (!base) return Response.json({ error: "Sync is off" }, { status: 404 });
  const query = new URL(req.url).search;

  // Sign-in is a browser navigation: RemnaWeb keeps the OAuth state in its own cookie.
  if (path === "auth/start" && req.method === "GET") return Response.redirect(`${base}/api/sni/auth/start${query}`, 302);
  const allowed: readonly string[] = [...CORE_API, ...GAMES[await siteGame()].api];
  if (!allowed.includes(path)) return Response.json({ error: "Not found" }, { status: 404 });

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET") {
    body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return Response.json({ error: "Too large" }, { status: 413 });
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const auth = req.headers.get("authorization");
  if (auth) headers.Authorization = auth;
  // RemnaWeb answers, errors included, in the language of this page.
  const lang = (await cookies()).get(LOCALE_COOKIE)?.value;
  headers[LOCALE_HEADER] = isLocale(lang) ? lang : DEFAULT_LOCALE;
  // RemnaWeb keeps progress in the country of the panel host behind this site, whatever the page asks.
  const host = siteHost();
  if (host) headers[SITE_HEADER] = host;
  if (body) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(`${base}/api/sni/${path}${query}`, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return new Response(await res.arrayBuffer(), {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Unavailable" }, { status: 502 });
  }
}

export const GET = forward;
export const PUT = forward;
export const POST = forward;
export const PATCH = forward;
