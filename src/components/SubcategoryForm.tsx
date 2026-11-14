"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createCategory } from "@/lib/reviews/actions";

/** "+ Sottocategoria": a name, and the new category is created inside this one. */
export function SubcategoryForm({
  lang,
  parentId,
  signedIn,
  t,
  errors,
}: {
  lang: string;
  parentId: string;
  signedIn: boolean;
  t: { subAdd: string; subPlaceholder: string; subCreate: string; subCancel: string };
  errors: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createCategory, {});

  if (!signedIn) return null;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start cursor-pointer rounded-full border border-dashed border-zinc-400 px-4 py-2 text-sm font-medium hover:border-zinc-900 dark:border-zinc-600 dark:hover:border-zinc-100"
      >
        {t.subAdd}
      </button>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="parentId" value={parentId} />
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          required
          minLength={2}
          maxLength={60}
          autoFocus
          placeholder={t.subPlaceholder}
          className="h-10 min-w-0 flex-1 rounded-full border border-zinc-300 bg-transparent px-4 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-10 cursor-pointer rounded-full bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t.subCreate}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 cursor-pointer px-2 text-sm text-zinc-500 hover:underline">
          {t.subCancel}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error === "auth" ? (
            <Link href={`/${lang}/login`} className="underline">
              {errors.auth}
            </Link>
          ) : (
            errors[state.error] ?? errors.generic
          )}
        </p>
      )}
    </form>
  );
}
