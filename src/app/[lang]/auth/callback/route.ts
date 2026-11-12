import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing page of the confirmation email. Supabase sends the user here with
 * a one-time `code`, which is exchanged for a session cookie.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/[lang]/auth/callback">,
) {
  const { lang } = await params;
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(`/${lang}`, request.url));
  }
  return NextResponse.redirect(new URL(`/${lang}/login`, request.url));
}
