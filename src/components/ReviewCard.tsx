import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { ReviewRow, Viewer } from "@/lib/data/types";
import { formatDate } from "@/lib/format";
import { Avatar } from "./Avatar";
import { DeleteReviewButton } from "./DeleteReviewButton";
import { LikeButton } from "./LikeButton";
import { ReviewPhotos } from "./ReviewPhotos";
import { Stars } from "./Stars";

export function ReviewCard({
  review,
  lang,
  showItem = false,
  showAuthor = true,
  viewer,
  back,
  t,
  spoilerLabel,
}: {
  review: ReviewRow;
  lang: string;
  showItem?: boolean;
  showAuthor?: boolean;
  viewer: Viewer;
  /** Where to go after deleting this review. */
  back: string;
  t: Dictionary["reviewCard"];
  spoilerLabel: string;
}) {
  const item = review.item;
  const username = review.author?.username;
  const own = viewer.id !== null && viewer.id === review.user_id;
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
            {item.category.icon ? `${item.category.icon} ` : ""}
            {item.category.name}
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {showAuthor && username && (
          <Link
            href={`/${lang}/u/${username}`}
            className="flex items-center gap-2 font-medium hover:underline"
          >
            <Avatar url={review.author?.avatar_url} name={username} size={24} />
            {review.author?.display_name || `@${username}`}
          </Link>
        )}
        <Stars rating={review.rating} />
        <Link href={`/${lang}/r/${review.id}`} title={t.openReview} className="text-zinc-500 hover:underline">
          <time dateTime={review.created_at}>{formatDate(review.created_at, lang)}</time>
        </Link>
      </div>
      {review.body &&
        (review.contains_spoiler ? (
          <details>
            <summary className="cursor-pointer text-sm text-zinc-500">
              {spoilerLabel}
            </summary>
            <p className="mt-1 whitespace-pre-line">{review.body}</p>
          </details>
        ) : (
          <p className="whitespace-pre-line text-zinc-800 dark:text-zinc-200">
            {review.body}
          </p>
        ))}
      <ReviewPhotos photos={review.photos} openLabel={t.openReview} />
      <div className="flex items-center gap-4">
        <Link
          href={`/${lang}/r/${review.id}#comments`}
          title={t.comments}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <span aria-hidden>💬</span>
          {review.comments_count > 0 && <span className="tabular-nums">{review.comments_count}</span>}
          <span className="sr-only">{t.comments}</span>
        </Link>
        <LikeButton
          reviewId={review.id}
          initialLiked={viewer.liked.includes(review.id)}
          initialCount={review.likes_count}
          signedIn={viewer.id !== null}
          own={own}
          lang={lang}
          labels={{ like: t.like, unlike: t.unlike, likes: t.likes }}
        />
        {own && (
          <Link
            href={`/${lang}/r/${review.id}/edit?back=${encodeURIComponent(back)}`}
            className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
          >
            {t.edit}
          </Link>
        )}
        {own && (
          <DeleteReviewButton
            reviewId={review.id}
            lang={lang}
            back={back}
            label={t.delete}
            confirmText={t.confirmDelete}
          />
        )}
      </div>
    </article>
  );
}
