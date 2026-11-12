import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { ListSummary } from "@/lib/data/types";
import { fill } from "@/lib/format";

/** A list in a grid: title, owner, count and the first few items. */
export function ListCard({
  list,
  preview,
  lang,
  showOwner = false,
  t,
}: {
  list: ListSummary;
  preview: string[];
  lang: string;
  showOwner?: boolean;
  t: Dictionary["lists"];
}) {
  return (
    <Link
      href={`/${lang}/l/${list.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4 hover:border-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-100"
    >
      <span className="font-semibold">{list.title}</span>
      <span className="text-xs text-zinc-500">
        {list.items_count === 1
          ? t.itemsOne
          : fill(t.items, { n: String(list.items_count) })}
        {showOwner &&
          list.owner &&
          ` · ${t.by} ${list.owner.display_name || `@${list.owner.username}`}`}
      </span>
      {preview.length > 0 && (
        <ol className="flex flex-col gap-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          {preview.map((name, i) => (
            <li key={i} className="truncate">
              {list.ranked ? `${i + 1}. ` : "· "}
              {name}
            </li>
          ))}
          {list.items_count > preview.length && (
            <li className="text-zinc-400">…</li>
          )}
        </ol>
      )}
    </Link>
  );
}
