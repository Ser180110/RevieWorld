import Link from "next/link";
import type { CategorySummary } from "@/lib/data/types";
import { styleOf } from "@/lib/categoryStyle";

/** Coloured tile with the category emoji (home, explore page). */
export function CategoryTile({
  category,
  lang,
  reviewsLabel,
  insideLabel,
}: {
  category: CategorySummary;
  lang: string;
  reviewsLabel: string;
  /** "dentro": shown before the parent's name on subcategories. */
  insideLabel?: string;
}) {
  const { emoji, classes } = styleOf(category);
  return (
    <Link
      href={`/${lang}/c/${category.slug}`}
      className={`group flex aspect-[4/3] flex-col justify-between rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-md ${classes.tile}`}
    >
      <span className="text-4xl leading-none transition group-hover:scale-110" aria-hidden>
        {emoji}
      </span>
      <span className="flex flex-col">
        {insideLabel && category.parent_name && (
          <span className="line-clamp-1 text-xs opacity-70">
            📂 {insideLabel} {category.parent_name}
          </span>
        )}
        <span className="line-clamp-2 font-semibold leading-tight">{category.name}</span>
        <span className="text-xs opacity-70">
          {category.reviews_count} {reviewsLabel}
        </span>
      </span>
    </Link>
  );
}
