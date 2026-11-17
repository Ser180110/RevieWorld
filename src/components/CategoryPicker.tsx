"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Suggestion } from "@/lib/data/types";
import {
  createCategory,
  suggestCategories,
  suggestParentCategories,
  type ParentSuggestion,
} from "@/lib/reviews/actions";
import { styleOf } from "@/lib/categoryStyle";
import { guessEmoji } from "@/lib/categoryStyle";
import { normalizeName } from "@/lib/normalize";
import { EmojiPicker } from "./EmojiPicker";
import { count } from "@/lib/format";
import { useDebounced } from "./useDebounced";

const input =
  "h-12 w-full rounded-full border border-zinc-300 bg-transparent px-5 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100";

export function CategoryPicker({
  lang,
  initialQuery,
  t,
  common,
  errors,
}: {
  lang: string;
  initialQuery: string;
  t: Dictionary["newReview"];
  common: Dictionary["common"];
  errors: Dictionary["reviewForm"]["errors"];
}) {
  const [query, setQuery] = useState(initialQuery);
  const debounced = useDebounced(query.trim());
  const [results, setResults] = useState<{ q: string; list: Suggestion[] }>({
    q: "",
    list: [],
  });
  const [state, formAction, pending] = useActionState(createCategory, {});
  const [chosenEmoji, setChosenEmoji] = useState<string | null>(null);
  const [parents, setParents] = useState<{
    q: string;
    list: ParentSuggestion[];
  }>({ q: "", list: [] });
  const [parentId, setParentId] = useState("");

  useEffect(() => {
    if (debounced.length < 2) return;
    let active = true;
    suggestCategories(debounced).then((list) => {
      if (active) setResults({ q: debounced, list });
    });
    suggestParentCategories(debounced).then((list) => {
      if (active) setParents({ q: debounced, list });
    });
    return () => {
      active = false;
    };
  }, [debounced]);

  const ready = debounced.length >= 2 && results.q === debounced;
  const suggestions = ready ? results.list : [];
  const parentList = parents.q === debounced ? parents.list : [];
  const parentChosen = parentList.some((p) => p.id === parentId)
    ? parentId
    : "";

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t.categoryLabel}</span>
        <input
          className={input}
          value={query}
          autoFocus
          placeholder={t.categoryPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {ready && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {suggestions.length ? t.suggestionsTitle : t.noSuggestions}
          </h2>
          {suggestions.length > 0 && (
            <ul className="flex flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/${lang}/c/${s.slug}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-sm text-zinc-500">
                      {count(s.reviews_count, common.review, common.reviews)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="name" value={query.trim()} />
            <input type="hidden" name="parentId" value={parentChosen} />
            {parentList.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                <span className="text-sm font-medium">
                  {t.parentAsk.replace("{name}", query.trim())}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setParentId("")}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                      !parentChosen
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-800"
                    }`}
                  >
                    {t.parentNone}
                  </button>
                  {parentList.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setParentId(p.id)}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                        parentChosen === p.id
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-800"
                      }`}
                    >
                      📂 {t.parentInside} {styleOf(p).emoji} {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <EmojiPicker
              value={chosenEmoji ?? guessEmoji(normalizeName(query))}
              onChange={setChosenEmoji}
              label={t.emojiPick}
              otherLabel={t.emojiOther}
              onlyEmojiLabel={t.emojiOnly}
            />
            <button
              type="submit"
              disabled={pending}
              className="self-start rounded-full border border-zinc-900 px-5 py-2 text-sm font-medium hover:bg-zinc-900 hover:text-white disabled:opacity-50 dark:border-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
            >
              {pending
                ? t.creating
                : parentChosen
                  ? t.createSubcategory
                      .replace("{name}", query.trim())
                      .replace(
                        "{parent}",
                        parentList.find((p) => p.id === parentChosen)?.name ??
                          "",
                      )
                  : t.createCategory.replace("{name}", query.trim())}
            </button>
          </form>
          {state.error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {state.error === "auth" ? (
                <Link href={`/${lang}/login`} className="underline">
                  {errors.auth}
                </Link>
              ) : (
                errors[state.error]
              )}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
