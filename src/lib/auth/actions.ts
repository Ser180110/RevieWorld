"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import type {
  AuthErrorCode,
  AuthFormState,
  NewPasswordFormState,
  ResetFormState,
} from "./types";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("lang") ?? "");
  return hasLocale(value) ? value : defaultLocale;
}

/** Maps Supabase error codes to the messages we translate. */
function toErrorCode(code: string | undefined): AuthErrorCode {
  switch (code) {
    case "invalid_credentials":
    case "email_not_confirmed":
    case "user_already_exists":
    case "weak_password":
      return code;
    case "email_exists":
      return "user_already_exists";
    case "email_address_invalid":
    case "validation_failed":
      return "invalid_email";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rate_limit";
    default:
      return "generic";
  }
}

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!supabaseEnv()) return { error: "generic" };
  const lang = localeOf(formData);
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid_credentials" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: toErrorCode(error.code) };

  redirect(`/${lang}`);
}

const signUpSchema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/),
  email: z.email(),
  password: z.string().min(8),
});

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!supabaseEnv()) return { error: "generic" };
  const lang = localeOf(formData);
  const parsed = signUpSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "username") return { error: "invalid_username" };
    if (field === "email") return { error: "invalid_email" };
    return { error: "weak_password" };
  }
  const { username, email, password } = parsed.data;

  const supabase = await createClient();

  // Friendly early check; the database trigger still guarantees uniqueness.
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username.replace(/_/g, "\\_"))
    .maybeSingle();
  if (taken) return { error: "username_taken" };

  // Confirmation link points back to this site (local, Vercel preview or production).
  const site = await siteUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, locale: lang },
      emailRedirectTo: `${site}/${lang}/auth/callback`,
    },
  });
  if (error) return { error: toErrorCode(error.code) };

  // With email confirmation turned off, Supabase signs the user in right away.
  if (data.session) redirect(`/${lang}`);
  return { done: true };
}

/** Where links in auth emails should land (local, Vercel preview or production). */
async function siteUrl(): Promise<string> {
  const origin = (await headers()).get("origin");
  return process.env.NEXT_PUBLIC_SITE_URL || origin || "http://localhost:3000";
}

/**
 * "Password dimenticata?": emails a link to choose a new password. Always
 * answers "done" for unknown emails too, so nobody can probe who is signed up.
 */
export async function requestPasswordReset(
  _prev: ResetFormState,
  formData: FormData,
): Promise<ResetFormState> {
  if (!supabaseEnv()) return { error: "generic" };
  const lang = localeOf(formData);
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { error: "invalid_email" };

  const supabase = await createClient();
  const site = await siteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${site}/${lang}/auth/callback?next=/${lang}/reset-password`,
  });
  if (error) {
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit" || error.status === 429) {
      return { error: "rate_limit" };
    }
    if (error.code === "email_address_invalid" || error.code === "validation_failed") return { error: "invalid_email" };
    console.error("requestPasswordReset", error);
    return { error: "generic" };
  }
  return { done: true };
}

/** Sets a new password for the signed-in user (after the email link, or from the settings). */
export async function updatePassword(
  _prev: NewPasswordFormState,
  formData: FormData,
): Promise<NewPasswordFormState> {
  if (!supabaseEnv()) return { error: "generic" };
  const lang = localeOf(formData);
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "weak_password" };
  if (password !== confirm) return { error: "mismatch" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "expired" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "same_password" };
    if (error.code === "weak_password") return { error: "weak_password" };
    if (error.code === "session_not_found" || error.code === "session_expired") return { error: "expired" };
    console.error("updatePassword", error);
    return { error: "generic" };
  }
  redirect(`/${lang}?password=changed`);
}

export async function signOut(formData: FormData) {
  const lang = localeOf(formData);
  if (supabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(`/${lang}`);
}

/**
 * "Continua con Google": sends the user to Google, which comes back to
 * /auth/callback with a code. New users get a profile from the database
 * trigger (name and photo from Google, username from the email).
 */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const lang = localeOf(formData);
  if (!supabaseEnv()) redirect(`/${lang}/login`);
  const supabase = await createClient();
  const site = await siteUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${site}/${lang}/auth/callback`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    console.error("signInWithGoogle", error);
    redirect(`/${lang}/login?google=error`);
  }
  redirect(data.url);
}
