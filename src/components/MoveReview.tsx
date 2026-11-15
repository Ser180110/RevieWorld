"use client";

import { useActionState, useEffect, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Suggestion } from "@/lib/data/types";
import { moveReview, suggestCategories } from "@/lib/reviews/actions";
import { useDebounced } from "./useDebounced";

type Choice = { id: string; name: string; hint?: string };

const field =
  "h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100";
const chip = (on: boolean) =>
  `cursor-pointer rounded-full border px-3 py-1.5 text-sm transition ${
    on
      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
      : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
  }`;

/** Edit page: move the review to another category or subcategory. */
export function MoveReview({
  lang,
  reviewId,
  currentCategoryId,
  currentCategoryName,
  itemName,
  quick,
  t,
}: {
  lang: string;
  reviewId: string;
  currentCategoryId: string;
  currentCategoryName: string;
  itemName: string;
  /** Handy targets: the parent category and the subcategories. */
  quick: Choice[];
  t: Dictionary["editReview"]["move"];
}) {
  const [state, formAction, pending] = useActionState(moveReview, {});
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Choice | null>(null);
  const [name, setName] = useState(itemName);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const debounced = useDebounced(query.trim());
  const [results, setResults] = useState<{ q: string; list: Suggestion[] }>({
    q: "",
    list: [],
  });

  useEffect(() => {
    if (debounced.length < 2) return;
    let active = true;
    suggestCategories(debounced).then((list) => {
      if (active) setResults({ q: debounced, list });
    });
    return () => {
      active = false;
    };
  }, [debounced]);
  const found =
    debounced.length >= 2 && results.q === debounced
      ? results.list.filter((c) => c.id !== currentCategoryId)
      : [];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">📂 {t.title}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t.current} <strong>{currentCategoryName}</strong>
        </p>
      </div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer self-start rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {t.open}
        </button>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="reviewId" value={reviewId} />
          {/* With a new subcategory, categoryId is its parent (the current category). */}
          <input
            type="hidden"
            name="categoryId"
            value={creating ? currentCategoryId : (chosen?.id ?? "")}
          />
          {creating && (
            <input type="hidden" name="newCategory" value={newName} />
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t.quick}</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={chip(creating)}
                onClick={() => {
                  setCreating(true);
                  setChosen(null);
                  if (!newName) setNewName(itemName);
                }}
              >
                ➕ {t.newSub} {currentCategoryName}
              </button>
              {quick.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={chip(!creating && chosen?.id === c.id)}
                  onClick={() => {
                    setCreating(false);
                    setChosen(c);
                  }}
                >
                  {c.hint ? `${c.hint} ` : ""}
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {creating && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t.newSubName}</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={60}
                className={field}
              />
            </label>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t.search}</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={field}
            />
          </label>
          {found.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {found.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={chip(!creating && chosen?.id === c.id)}
                  onClick={() => {
                    setCreating(false);
                    setChosen({ id: c.id, name: c.name });
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t.itemName}</span>
            <input
              name="itemName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              className={field}
            />
            <span className="text-xs text-zinc-500">{t.itemHint}</span>
          </label>

          {(creating ? newName.trim().length >= 2 : chosen) && (
            <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
              {t.willMove}{" "}
              <strong>
                {creating
                  ? `${currentCategoryName} › ${newName.trim()}`
                  : chosen?.name}
              </strong>
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
              disabled={
                (creating ? newName.trim().length < 2 : !chosen) || pending
              }
              className="cursor-pointer rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {pending ? t.moving : t.submit}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setChosen(null);
                setCreating(false);
              }}
              className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {t.cancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
