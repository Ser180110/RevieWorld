"use client";

import { useActionState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { deleteCategory } from "@/lib/reviews/actions";
import { ConfirmButton } from "./ConfirmButton";

/** Founders only: "🗑️ Elimina categoria", after an "are you sure?". */
export function CategoryDelete({
  lang,
  categoryId,
  name,
  t,
}: {
  lang: string;
  categoryId: string;
  name: string;
  t: Dictionary["category"]["delete"];
}) {
  const [state, formAction, pending] = useActionState(deleteCategory, {});
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <ConfirmButton
        label={pending ? t.deleting : `🗑️ ${t.open}`}
        confirmText={t.confirm.replaceAll("{name}", name)}
        okLabel={t.confirmOk}
        className="cursor-pointer self-start rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-red-700 hover:bg-white dark:bg-black/30 dark:text-red-400 dark:hover:bg-black/50"
      />
      {state.error && <p className="text-xs text-red-700 dark:text-red-400">{t.errors[state.error]}</p>}
    </form>
  );
}
