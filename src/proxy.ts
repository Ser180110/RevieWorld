import { NextResponse, type NextRequest } from "next/server";
import { hasLocale, localeFromAcceptLanguage } from "@/i18n/config";
import { refreshSession } from "@/lib/supabase/session";

const LOCALE_COOKIE = "NEXT_LOCALE";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  if (!hasLocale(firstSegment)) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale =
      saved && hasLocale(saved)
        ? saved
        : localeFromAcceptLanguage(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request });
  response.cookies.set(LOCALE_COOKIE, firstSegment, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return refreshSession(request, response);
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals and files with an extension.
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
