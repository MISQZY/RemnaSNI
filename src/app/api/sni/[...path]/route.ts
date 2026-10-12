import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, isLocale } from "@/core/i18n/locales";
import { CORE_API, GAMES } from "@/core/games";
import { remnaWebUrl } from "@/core/remnaweb";
import { SITE_HEADER, siteHost } from "@/core/site";

// RemnaWeb's SNI API behind this site's own origin: the page never names RemnaWeb, so a visitor or a
// probe sees a standalone game. Only the calls the games make (core/games.ts) are passed through: those of every
// game, so a tab left open on the game a node ran before a switch in RemnaWeb still saves its progress.

const API = new Set<string>([...CORE_API, ...Object.values(GAMES).flatMap((g) => g.api)]);

const MAX_BODY_BYTES = 64 * 1024;
const TIMEOUT_MS = 10_000;

type Ctx = { params: Promise<{ path: string[] }> };

/**
 * An answer of the proxy itself: without an `error` text, so the page shows its own message in its language
 * (core/api.ts) rather than these internals.
 */
const fail = (status: number) => Response.json({}, { status });

/** The body, or null when it is over MAX_BODY_BYTES: refused as it comes, not read whole first. */
async function readBody(req: Request): Promise<ArrayBuffer | null> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return null;
  if (!req.body) return new ArrayBuffer(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = req.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    body.set(c, at);
    at += c.byteLength;
  }
  return body.buffer;
}

async function forward(req: Request, { params }: Ctx): Promise<Response> {
  const path = (await params).path.join("/");
  const base = remnaWebUrl();
  if (!base) return fail(404);
  const query = new URL(req.url).search;

  // Sign-in is a browser navigation: RemnaWeb keeps the OAuth state in its own cookie.
  if (path === "auth/start" && req.method === "GET") return Response.redirect(`${base}/api/sni/auth/start${query}`, 302);
  if (!API.has(path)) return fail(404);

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET") {
    const read = await readBody(req);
    if (!read) return fail(413);
    body = read;
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

  // A stream (the crash's round as it happens) goes through as it comes, for as long as the page keeps it open.
  if (path.endsWith("/stream") && req.method === "GET") {
    // The stream itself lasts as long as the page keeps it; only its start has a time limit.
    const started = new AbortController();
    const timer = setTimeout(() => started.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${base}/api/sni/${path}${query}`, {
        headers: { ...headers, Accept: "text/event-stream" },
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.any([req.signal, started.signal]),
      });
      // RemnaWeb's own refusal (a session that ran out, too many viewers) goes through as it is, for the page to tell.
      if (!res.ok) return passOn(res);
      if (!res.body) return fail(502);
      return new Response(res.body, {
        headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
      });
    } catch (err) {
      if (!req.signal.aborted) console.error(err);
      return fail(502);
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    const res = await fetch(`${base}/api/sni/${path}${query}`, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return passOn(res);
  } catch (err) {
    console.error(err);
    return fail(502);
  }
}

/**
 * RemnaWeb's answer to the page, JSON only: anything else (a proxy's error page in front of RemnaWeb) would show
 * on this site's origin what stands behind it.
 */
async function passOn(res: Response): Promise<Response> {
  if (res.status === 204) return new Response(null, { status: 204 });
  if (!res.headers.get("content-type")?.includes("application/json")) return fail(res.ok ? 502 : res.status >= 500 ? 502 : res.status);
  const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  const retryAfter = res.headers.get("retry-after");
  if (retryAfter) headers["Retry-After"] = retryAfter;
  return new Response(await res.arrayBuffer(), { status: res.status, headers });
}

export const GET = forward;
export const PUT = forward;
export const POST = forward;
