"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { ItemSearchResult } from "@/lib/data/types";
import { addItemToList, searchItems } from "@/lib/lists/actions";
import { useDebounced } from "./useDebounced";

/** Owner-only search box on a list page: find items in any category and add them. */
export function ListItemSearch({
  listId,
  t,
}: {
  listId: string;
  t: Dictionary["lists"];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const debounced = useDebounced(q.trim());
  const [results, setResults] = useState<{
    q: string;
    list: ItemSearchResult[];
  }>({ q: "", list: [] });
  const [added, setAdded] = useState<string[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (debounced.length < 2) return;
    let active = true;
    searchItems(debounced).then((list) => {
      if (active) setResults({ q: debounced, list });
    });
    return () => {
      active = false;
    };
  }, [debounced]);

  const shown =
    debounced.length >= 2 && results.q === debounced ? results.list : null;

  function add(itemId: string) {
    start(async () => {
      if (await addItemToList(listId, itemId)) {
        setAdded((a) => [...a, itemId]);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.addLabel}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.addPlaceholder}
          className="h-11 rounded-full border border-zinc-300 bg-transparent px-4 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
        />
      </label>
      {shown &&
        (shown.length === 0 ? (
          <p className="text-sm text-zinc-500">{t.noResults}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {shown.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-2"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{item.name}</span>{" "}
                  <span className="text-sm text-zinc-500">
                    {item.category?.name}
                  </span>
                </span>
                {added.includes(item.id) ? (
                  <span className="text-sm text-zinc-500">✓ {t.added}</span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => add(item.id)}
                    className="cursor-pointer rounded-full border border-zinc-300 px-3 py-0.5 text-sm hover:border-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-100"
                  >
                    + {t.add}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
