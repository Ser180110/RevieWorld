import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import { REVIEW_SORTS, type ReviewSort } from "@/lib/data/queries";

/** Chips to reorder a list of reviews (?sort=…); most liked by default. */
export function ReviewSortTabs({
  base,
  current,
  t,
}: {
  /** The page path, without the query. */
  base: string;
  current: ReviewSort;
  t: Dictionary["reviewSort"];
}) {
  return (
    <nav aria-label={t.label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm sm:mx-0 sm:px-0">
      {REVIEW_SORTS.map((s) => (
        <Link
          key={s}
          href={s === "likes" ? `${base}#reviews` : `${base}?sort=${s}#reviews`}
          scroll={false}
          replace
          aria-current={s === current ? "true" : undefined}
          className={`shrink-0 rounded-full border px-3 py-1.5 font-medium transition ${
            s === current
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-300 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
          }`}
        >
          {t[s]}
        </Link>
      ))}
    </nav>
  );
}
