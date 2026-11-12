import Link from "next/link";
import type { ItemCard } from "@/lib/data/types";
import { formatStars } from "@/lib/format";

/** Compact card for an item (favourites, "Da provare"). `children` holds owner controls. */
export function ItemTile({ item, lang, children }: { item: ItemCard; lang: string; children?: React.ReactNode }) {
  const href = item.category ? `/${lang}/c/${item.category.slug}/${item.slug}` : "#";
  return (
    <div className="flex min-h-28 flex-col justify-between gap-2 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex min-w-0 flex-col">
        <Link href={href} className="line-clamp-2 font-semibold hover:underline">
          {item.name}
        </Link>
        {item.category && (
          <Link href={`/${lang}/c/${item.category.slug}`} className="truncate text-sm text-zinc-500 hover:underline">
            {item.category.name}
          </Link>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-sm text-zinc-500">
        <span className="tabular-nums">★ {formatStars(item.avg_rating)}</span>
        {children}
      </div>
    </div>
  );
}
