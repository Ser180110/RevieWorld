"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { createList, updateList } from "@/lib/lists/actions";

const field =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100";

/** Create a list (optionally with a first item) or edit an existing one. */
export function ListForm({
  lang,
  t,
  existing,
  itemId,
  cancelHref,
}: {
  lang: string;
  t: Dictionary["lists"];
  existing?: {
    id: string;
    title: string;
    description: string | null;
    ranked: boolean;
  };
  itemId?: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    existing ? updateList : createList,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="lang" value={lang} />
      {existing && <input type="hidden" name="listId" value={existing.id} />}
      {itemId && <input type="hidden" name="itemId" value={itemId} />}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.titleLabel}</span>
        <input
          name="title"
          required
          maxLength={100}
          defaultValue={existing?.title}
          placeholder={t.titlePlaceholder}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.descriptionLabel}</span>
        <textarea
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={existing?.description ?? ""}
          className={field}
        />
      </label>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          name="ranked"
          defaultChecked={existing?.ranked}
          className="mt-1"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">{t.rankedLabel}</span>
          <span className="text-xs text-zinc-500">{t.rankedHint}</span>
        </span>
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {t.errors[state.error]}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-full bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? t.saving : existing ? t.save : t.create}
        </button>
        <Link
          href={cancelHref}
          className="text-sm text-zinc-500 hover:underline"
        >
          {t.cancel}
        </Link>
      </div>
    </form>
  );
}
