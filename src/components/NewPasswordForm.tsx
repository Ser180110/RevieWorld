"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { updatePassword } from "@/lib/auth/actions";
import { PasswordInput } from "./PasswordInput";

const input =
  "h-11 rounded-lg border border-zinc-300 bg-transparent px-3 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100";

export function NewPasswordForm({ lang, t }: { lang: string; t: Dictionary["auth"] }) {
  const [state, formAction, pending] = useActionState(updatePassword, {});
  const eye = { showLabel: t.showPassword, hideLabel: t.hidePassword };
  // Controlled, so a wrong attempt does not wipe what was typed.
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="lang" value={lang} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.newPassword}</span>
        <PasswordInput name="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" className={input} {...eye} />
        <span className="text-xs text-zinc-500">{t.passwordHint}</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.confirmPassword}</span>
        <PasswordInput name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" className={input} {...eye} />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t.newPasswordErrors[state.error]}{" "}
          {state.error === "expired" && (
            <Link href={`/${lang}/forgot-password`} className="font-medium underline">
              {t.forgotButton}
            </Link>
          )}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-zinc-900 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? t.saving : t.savePassword}
      </button>
    </form>
  );
}
