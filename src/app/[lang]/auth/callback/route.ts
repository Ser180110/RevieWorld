import type { EmailOtpType } from "@supabase/supabase-js";
import { connection, NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/**
 * Landing page of the emails (sign-up confirmation, password reset). Supabase
 * sends the user here with a one-time `code` (same browser) or a `token_hash`
 * (any browser or device, when the email template links here directly).
 * Either one is exchanged for a session cookie.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/[lang]/auth/callback">,
) {
  await connection();
  const { lang } = await params;
  const search = request.nextUrl.searchParams;
  const code = search.get("code");
  const tokenHash = search.get("token_hash");
  const type = search.get("type") as EmailOtpType | null;
  const nextParam = search.get("next") ?? "";
  // Only paths inside this site; a recovery link always goes to the new-password page.
  let next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : `/${lang}`;
  if (type === "recovery") next = `/${lang}/reset-password`;

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  if (ok) return NextResponse.redirect(new URL(next, request.url));
  const failed = next.endsWith("/reset-password") ? `/${lang}/forgot-password?expired=1` : `/${lang}/login`;
  return NextResponse.redirect(new URL(failed, request.url));
}
