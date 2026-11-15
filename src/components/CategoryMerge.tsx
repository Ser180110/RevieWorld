"use client";

import { useActionState, useEffect, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Suggestion } from "@/lib/data/types";
import { mergeCategory, suggestCategories } from "@/lib/reviews/actions";
import { ConfirmButton } from "./ConfirmButton";
import { useDebounced } from "./useDebounced";

/** Founders only: "🔀 Unisci a…" merges a duplicate category into another one. */
export function CategoryMerge({
  lang,
  categoryId,
  name,
  t,
}: {
  lang: string;
  categoryId: string;
  name: string;
  t: Dictionary["category"]["merge"];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(mergeCategory, {});
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim());
  const [found, setFound] = useState<{ q: string; list: Suggestion[] }>({ q: "", list: [] });

  useEffect(() => {
    if (debounced.length < 2) return;
    let active = true;
    suggestCategories(debounced).then((list) => {
      if (active) setFound({ q: debounced, list });
    });
    return () => {
      active = false;
    };
  }, [debounced]);
  const results = debounced.length >= 2 && found.q === debounced ? found.list.filter((c) => c.id !== categoryId) : [];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer self-start rounded-full bg-white/60 px-3 py-1 text-xs font-medium hover:bg-white dark:bg-black/30 dark:hover:bg-black/50"
      >
        🔀 {t.open}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-3 rounded-xl bg-white/80 p-4 text-zinc-900 dark:bg-black/40 dark:text-zinc-100">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="targetId" value={target?.id ?? ""} />
      <p className="text-sm font-medium">{t.title.replace("{name}", name)}</p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">{t.hint}</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.search}
        className="h-10 rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
      />
      {results.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setTarget({ id: c.id, name: c.name })}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                target?.id === c.id
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-800"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{t.errors[state.error]}</p>}
      <div className="flex flex-wrap gap-2">
        {target && !pending ? (
          <ConfirmButton
            label={t.submit.replace("{target}", target.name)}
            okLabel={t.confirmOk}
            confirmText={t.confirm.replaceAll("{name}", name).replaceAll("{target}", target.name)}
            className="cursor-pointer rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          />
        ) : (
          <button type="button" disabled className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white opacity-40 dark:bg-zinc-100 dark:text-zinc-900">
            {pending ? t.merging : t.pick}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTarget(null);
          }}
          className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
