import type { EmailOtpType } from "@supabase/supabase-js";
import { connection, NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/**
 * Landing page of the emails (sign-up confirmation, password reset). Supabase
 * sends the user here with a one-time `code` (same browser) or a `token_hash`
 * (any browser or device, when the email template links here directly).
 * Either one is exchanged for a session cookie. "Continua con Google" also
 * comes back here with a `code` (or an `error` when the user cancels).
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
  if (ok && type !== "recovery" && next === `/${lang}`) {
    // Someone who just confirmed their account and hasn't started yet: first steps.
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (userId) {
      const [people, cats, reviews] = await Promise.all([
        supabase.from("user_follows").select("followed_id", { count: "exact", head: true }).eq("follower_id", userId),
        supabase.from("category_follows").select("category_id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      if (!people.count && !cats.count && !reviews.count) next = `/${lang}/welcome`;
    }
  }
  if (ok) return NextResponse.redirect(new URL(next, request.url));
  const failed = next.endsWith("/reset-password")
    ? `/${lang}/forgot-password?expired=1`
    : search.get("error")
      ? `/${lang}/login?google=error`
      : `/${lang}/login`;
  return NextResponse.redirect(new URL(failed, request.url));
}
