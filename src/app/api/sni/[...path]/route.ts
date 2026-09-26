import { syncUrl } from "@/lib/sync-url";

// RemnaWeb's SNI API behind this site's own origin: the page never names RemnaWeb, so a visitor or a
// probe sees a standalone game. Only the calls the game makes are passed through.

const API = new Set(["progress", "pets", "pets/upgrade", "auth/logout"]);
const MAX_BODY_BYTES = 64 * 1024;
const TIMEOUT_MS = 10_000;

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(req: Request, { params }: Ctx): Promise<Response> {
  const path = (await params).path.join("/");
  const base = syncUrl();
  if (!base) return Response.json({ error: "Sync is off" }, { status: 404 });
  const query = new URL(req.url).search;

  // Sign-in is a browser navigation: RemnaWeb keeps the OAuth state in its own cookie.
  if (path === "auth/start" && req.method === "GET") return Response.redirect(`${base}/api/sni/auth/start${query}`, 302);
  if (!API.has(path)) return Response.json({ error: "Not found" }, { status: 404 });

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET") {
    body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return Response.json({ error: "Too large" }, { status: 413 });
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const auth = req.headers.get("authorization");
  if (auth) headers.Authorization = auth;
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
