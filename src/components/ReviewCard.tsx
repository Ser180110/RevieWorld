import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { ReviewRow, Viewer } from "@/lib/data/types";
import { styleOf } from "@/lib/categoryStyle";
import { fill, formatDate } from "@/lib/format";
import { Avatar } from "./Avatar";
import { DeleteReviewButton } from "./DeleteReviewButton";
import { LikeButton } from "./LikeButton";
import { ReviewPhotos } from "./ReviewPhotos";
import { ShareButton } from "./ShareButton";
import { StoryShareButton } from "./StoryShareButton";
import { ReportButton } from "./ReportButton";
import { Sticker } from "./Sticker";
import { splitSticker } from "@/lib/stickers";
import { Stars } from "./Stars";
import { ReviewText } from "./ReviewText";
import { detectLang } from "@/lib/translate/detect";

export function ReviewCard({
  review,
  lang,
  showItem = false,
  showAuthor = true,
  viewer,
  back,
  t,
  reportT,
}: {
  review: ReviewRow;
  lang: string;
  showItem?: boolean;
  showAuthor?: boolean;
  viewer: Viewer;
  /** Where to go after deleting this review. */
  back: string;
  t: Dictionary["reviewCard"];
  /** "Segnala" texts; without them there is no report button. */
  reportT?: Dictionary["report"];
}) {
  const item = review.item;
  const username = review.author?.username;
  const own = viewer.id !== null && viewer.id === review.user_id;
  const place = viewer.places?.[review.id];
  const { text, sticker } = splitSticker(review.body);
  return (
    <article className="mb-3 flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition last:mb-0 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {showItem && item?.category && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/${lang}/c/${item.category.slug}/${item.slug}`}
            className="text-lg font-semibold leading-tight hover:underline"
          >
            {item.name}
          </Link>
          <Link
            href={`/${lang}/c/${item.category.slug}`}
            className={`rounded-full px-2 py-0.5 text-xs font-medium transition hover:opacity-80 ${styleOf(item.category).classes.tile}`}
          >
            {styleOf(item.category).emoji} {item.category.name}
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
      {text && (
        <ReviewText
          text={text}
          reviewId={review.id}
          from={detectLang(text)}
          to={lang === "en" ? "en" : "it"}
          lang={lang}
          t={{
            translate: t.translate,
            showOriginal: t.showOriginal,
            translating: t.translating,
            translated: t.translated,
            failed: t.translateFailed,
            google: t.translateGoogle,
            spoiler: t.spoilerShow,
            spoilerHint: t.spoilerHint,
          }}
        />
      )}
      {sticker && (
        <div className="py-1">
          <Sticker a={sticker} lang={lang} />
        </div>
      )}
      <ReviewPhotos photos={review.photos} openLabel={t.openReview} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
        {place && (
          <Link
            href={`/${lang}/map?lat=${place.lat}&lng=${place.lng}&review=${review.id}`}
            title={t.onMap}
            className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <span aria-hidden>📍</span>
            <span className="sr-only">{t.onMap}</span>
          </Link>
        )}
        <ShareButton
          path={`/${lang}/r/${review.id}`}
          title={item?.name ?? "RevieWorld"}
          text={fill(t.shareText, {
            name: review.author?.display_name || `@${username ?? "?"}`,
            rating: String(review.rating / 2),
            what: item?.name ?? "",
          })}
          label={t.share}
          copiedLabel={t.copied}
        />
        <StoryShareButton lang={lang} reviewId={review.id} label={t.story} shortLabel={t.storyShort} busyLabel={t.story} errorLabel={t.story} compact />
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
        {!own && viewer.id && reportT && (
          <span className="ml-auto">
            <ReportButton lang={lang} targetType="review" targetId={review.id} t={reportT} compact />
          </span>
        )}
      </div>
    </article>
  );
}
