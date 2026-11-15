"use client";

import { useActionState, useEffect, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Suggestion } from "@/lib/data/types";
import {
  setCategoryParent,
  suggestCategories,
  suggestParentCategories,
  type ParentSuggestion,
} from "@/lib/reviews/actions";
import { useDebounced } from "./useDebounced";

type Choice = { id: string; name: string };

const chip = (on: boolean) =>
  `cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
    on
      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
      : "border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-800"
  }`;

/**
 * "📂 Sposta dentro…": puts this category inside another one, or back on top.
 * Shown to the creator and to the founders.
 */
export function CategoryParentEditor({
  lang,
  categoryId,
  slug,
  name,
  parentName,
  t,
}: {
  lang: string;
  categoryId: string;
  slug: string;
  name: string;
  /** Current parent, if it is already a subcategory. */
  parentName: string | null;
  t: Dictionary["category"]["parent"];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(setCategoryParent, {});
  const [chosen, setChosen] = useState<Choice | "top" | null>(null);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim());
  const [found, setFound] = useState<{ q: string; list: Suggestion[] }>({
    q: "",
    list: [],
  });
  const [hints, setHints] = useState<ParentSuggestion[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    suggestParentCategories(name).then((list) => {
      if (active) setHints(list.filter((c) => c.id !== categoryId));
    });
    return () => {
      active = false;
    };
  }, [open, name, categoryId]);

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

  const results =
    debounced.length >= 2 && found.q === debounced
      ? found.list.filter((c) => c.id !== categoryId)
      : [];
  const isChosen = (id: string) =>
    chosen !== null && chosen !== "top" && chosen.id === id;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer self-start rounded-full bg-white/60 px-3 py-1 text-xs font-medium hover:bg-white dark:bg-black/30 dark:hover:bg-black/50"
      >
        📂 {t.open}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-3 rounded-xl bg-white/80 p-4 text-zinc-900 dark:bg-black/40 dark:text-zinc-100"
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="slug" value={slug} />
      <input
        type="hidden"
        name="parentId"
        value={chosen && chosen !== "top" ? chosen.id : ""}
      />
      <p className="text-sm font-medium">{t.title.replace("{name}", name)}</p>

      {(hints.length > 0 || parentName) && (
        <div className="flex flex-wrap gap-2">
          {parentName && (
            <button
              type="button"
              className={chip(chosen === "top")}
              onClick={() => setChosen("top")}
            >
              ⬆️ {t.top}
            </button>
          )}
          {hints.map((c) => (
            <button
              key={c.id}
              type="button"
              className={chip(isChosen(c.id))}
              onClick={() => setChosen({ id: c.id, name: c.name })}
            >
              📂 {c.name}
            </button>
          ))}
        </div>
      )}

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
              className={chip(isChosen(c.id))}
              onClick={() => setChosen({ id: c.id, name: c.name })}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {chosen && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {chosen === "top"
            ? t.willBeTop.replace("{name}", name)
            : t.willBeInside
                .replace("{name}", name)
                .replace("{parent}", chosen.name)}
        </p>
      )}
      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {t.errors[state.error]}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!chosen || pending}
          className="cursor-pointer rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? t.saving : t.save}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setChosen(null);
          }}
          className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
