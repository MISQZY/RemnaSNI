import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

/**
 * `?lang=ru` picks the language, used by the RemnaWeb Mini App that opens the site in a frame: there the
 * `lang` cookie of a direct visit is not sent. The page renders in it right away, and a partitioned
 * cookie keeps it for the next pages inside that frame.
 */
export function proxy(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang");
  if (!isLocale(lang)) return NextResponse.next();

  req.cookies.set(LOCALE_COOKIE, lang);
  const res = NextResponse.next({ request: { headers: req.headers } });
  res.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 31536000, sameSite: "none", secure: true, partitioned: true });
  return res;
}

export const config = { matcher: ["/((?!api/|_next/|flag\.svg).*)"] };
