"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { requestPasswordReset } from "@/lib/auth/actions";

const input =
  "h-11 rounded-lg border border-zinc-300 bg-transparent px-3 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100";

export function ForgotPasswordForm({ lang, t }: { lang: string; t: Dictionary["auth"] }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {});

  if (state.done) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-900">
          {t.forgotSent}
        </p>
        <Link href={`/${lang}/login`} className="text-center text-sm font-medium underline">
          {t.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="lang" value={lang} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.email}</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t.resetErrors[state.error]}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-zinc-900 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? t.sending : t.forgotButton}
      </button>
      <Link href={`/${lang}/login`} className="text-center text-sm font-medium underline">
        {t.backToLogin}
      </Link>
    </form>
  );
}
