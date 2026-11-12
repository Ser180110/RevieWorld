"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import type { AuthErrorCode, AuthFormState } from "./types";

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
  const origin = (await headers()).get("origin");
  const site = process.env.NEXT_PUBLIC_SITE_URL || origin || "http://localhost:3000";
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

export async function signOut(formData: FormData) {
  const lang = localeOf(formData);
  if (supabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(`/${lang}`);
}
