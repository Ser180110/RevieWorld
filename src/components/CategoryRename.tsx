"use client";

import { useActionState, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { renameCategory } from "@/lib/reviews/actions";

/** Creator-only: fix the category name (allowed until others have reviewed in it). */
export function CategoryRename({
  lang,
  categoryId,
  slug,
  name,
  t,
}: {
  lang: string;
  categoryId: string;
  slug: string;
  name: string;
  t: Dictionary["category"];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(renameCategory, {});

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer self-start rounded-full bg-white/60 px-3 py-1 text-xs font-medium hover:bg-white dark:bg-black/30 dark:hover:bg-black/50"
      >
        ✏️ {t.rename}
      </button>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-xl bg-white/80 p-4 dark:bg-black/40">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="slug" value={slug} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t.renameLabel}</span>
        <input
          name="name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={60}
          className="h-10 rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
        />
      </label>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">{t.renameHint}</p>
      {state.error && <p className="text-sm text-red-600">{t.renameErrors[state.error]}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t.renameSave}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-sm text-zinc-600 hover:underline">
          {t.cancelStyle}
        </button>
      </div>
    </form>
  );
}
