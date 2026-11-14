"use client";

import { useActionState, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { deleteAccount } from "@/lib/account/actions";

/** "Danger zone" at the bottom of the settings: delete the account for good. */
export function DeleteAccount({
  lang,
  username,
  special,
  t,
}: {
  lang: string;
  username: string;
  /** Founder / ideator: warn that the badge will not come back by itself. */
  special: boolean;
  t: Dictionary["settings"]["deleteAccount"];
}) {
  const [state, formAction, pending] = useActionState(deleteAccount, {});
  const [typed, setTyped] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const matches = typed.trim().toLowerCase() === username.toLowerCase();

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-red-200 p-5 dark:border-red-900/60">
      <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">{t.title}</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.hint}</p>
      {state.error && <p className="text-sm text-red-600">{t.errors[state.error]}</p>}
      <button
        type="button"
        onClick={() => {
          setTyped("");
          dialog.current?.showModal();
        }}
        className="cursor-pointer self-start rounded-full border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
      >
        {t.button}
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => {
          if (e.target === dialog.current && !pending) dialog.current?.close();
        }}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <form action={formAction} className="flex flex-col gap-4 p-5">
          <input type="hidden" name="lang" value={lang} />
          <p className="text-base font-semibold">{t.confirmTitle}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.confirmText}</p>
          {special && <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t.badgeWarning}</p>}
          <label className="flex flex-col gap-1 text-sm">
            <span>
              {t.typeUsername} <strong>{username}</strong>
            </span>
            <input
              name="confirm_username"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-red-600 dark:border-zinc-700"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              disabled={pending}
              onClick={() => dialog.current?.close()}
              className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={!matches || pending}
              className="cursor-pointer rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? t.deleting : t.confirm}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
