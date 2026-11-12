import Link from "next/link";
import type { ReviewRow } from "@/lib/data/types";
import { formatDate } from "@/lib/format";
import { Stars } from "./Stars";

export function ReviewCard({
  review,
  lang,
  showItem = false,
  spoilerLabel,
}: {
  review: ReviewRow;
  lang: string;
  showItem?: boolean;
  spoilerLabel: string;
}) {
  const item = review.item;
  return (
    <article className="flex flex-col gap-2 border-b border-zinc-200 py-4 last:border-0 dark:border-zinc-800">
      {showItem && item?.category && (
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link
            href={`/${lang}/c/${item.category.slug}/${item.slug}`}
            className="font-semibold hover:underline"
          >
            {item.name}
          </Link>
          <Link
            href={`/${lang}/c/${item.category.slug}`}
            className="text-sm text-zinc-500 hover:underline"
          >
            {item.category.name}
          </Link>
        </div>
      )}
      <div className="flex items-center gap-3 text-sm">
        <Stars rating={review.rating} />
        <span className="font-medium">@{review.author?.username ?? "?"}</span>
        <time className="text-zinc-500" dateTime={review.created_at}>
          {formatDate(review.created_at, lang)}
        </time>
      </div>
      {review.body &&
        (review.contains_spoiler ? (
          <details>
            <summary className="cursor-pointer text-sm text-zinc-500">{spoilerLabel}</summary>
            <p className="mt-1 whitespace-pre-line">{review.body}</p>
          </details>
        ) : (
          <p className="whitespace-pre-line text-zinc-800 dark:text-zinc-200">{review.body}</p>
        ))}
    </article>
  );
}
