"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/lib/auth/types";
import type { Dictionary } from "@/i18n/dictionaries";

type Props = {
  mode: "signIn" | "signUp";
  lang: string;
  t: Dictionary["auth"];
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
};

const input =
  "h-11 rounded-lg border border-zinc-300 bg-transparent px-3 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100";

export function AuthForm({ mode, lang, t, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const signUp = mode === "signUp";

  if (state.done) {
    return (
      <p role="status" className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-900">
        {t.checkEmail}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="lang" value={lang} />

      {signUp && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.username}</span>
          <input
            name="username"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            autoComplete="username"
            className={input}
          />
          <span className="text-xs text-zinc-500">{t.usernameHint}</span>
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.email}</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.password}</span>
        <input
          name="password"
          type="password"
          required
          minLength={signUp ? 8 : undefined}
          autoComplete={signUp ? "new-password" : "current-password"}
          className={input}
        />
        {signUp && <span className="text-xs text-zinc-500">{t.passwordHint}</span>}
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t.errors[state.error]}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-zinc-900 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {signUp ? t.signUpButton : t.signInButton}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {signUp ? t.haveAccount : t.noAccount}{" "}
        <Link href={`/${lang}/${signUp ? "login" : "signup"}`} className="font-medium underline">
          {signUp ? t.signInButton : t.signUpButton}
        </Link>
      </p>
    </form>
  );
}
