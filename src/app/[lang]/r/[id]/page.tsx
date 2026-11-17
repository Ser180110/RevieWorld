import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ReportButton } from "@/components/ReportButton";
import { StoryShareButton } from "@/components/StoryShareButton";
import {
  getCommentReactions,
  getComments,
  getLikers,
  getReview,
  getReviewLocation,
  getViewer,
} from "@/lib/data/queries";
import { CommentReactions } from "@/components/CommentReactions";
import { deleteComment } from "@/lib/social/actions";
import { fill, formatDate } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { CommentForm } from "@/components/CommentForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ReviewCard } from "@/components/ReviewCard";
import { MentionText } from "@/components/MentionText";
import { Sticker } from "@/components/Sticker";
import { splitSticker } from "@/lib/stickers";
import { toPlain } from "@/lib/richtext";
import { ReviewSkeletons } from "@/components/Skeletons";

export async function generateMetadata({ params }: PageProps<"/[lang]/r/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const review = await getReview(id);
  if (!review || !hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const name = review.author?.display_name || `@${review.author?.username ?? "?"}`;
  const title = `${review.item?.name ?? ""} · ${fill(dict.reviewPage.title, { name })}`;
  const bodyText = toPlain(splitSticker(review.body).text);
  const description = `${"★".repeat(Math.floor(review.rating / 2))} ${review.rating / 2}/5${
    bodyText ? ` · ${bodyText.slice(0, 150)}` : ""
  }`;
  return { title, description, openGraph: { title, description, type: "article" } };
}

async function ReviewContent({ lang, id }: { lang: Locale; id: string }) {
  const dict = await getDictionary(lang);
  const t = dict.comments;
  const review = await getReview(id);
  if (!review || !review.item?.category) notFound();
  const [comments, likers, viewer, location] = await Promise.all([
    getComments(review.id),
    getLikers(review.id),
    getViewer([review]),
    getReviewLocation(review.id),
  ]);
  const reactions = await getCommentReactions(
    comments.map((c) => c.id),
    viewer.id,
  );
  const item = review.item;
  const category = item.category!;
  const itemHref = `/${lang}/c/${category.slug}/${item.slug}`;
  const reviewAuthor = viewer.id === review.user_id;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <span className="text-sm text-zinc-500">{dict.reviewPage.reviewOf}</span>
        <h1 className="text-3xl font-semibold tracking-tight">
          <Link href={itemHref} className="hover:underline">
            {item.name}
          </Link>
        </h1>
        <Link href={`/${lang}/c/${category.slug}`} className="text-sm text-zinc-500 hover:underline">
          {category.name}
        </Link>
      </header>

      <ReviewCard
        review={review}
        lang={lang}
        viewer={viewer}
        back={itemHref}
        t={dict.reviewCard}
        reportT={dict.report}
      />

      <div className="-mt-4 flex flex-wrap items-center gap-2 text-sm">
        <StoryShareButton
          lang={lang}
          reviewId={review.id}
          label={dict.story.button}
          busyLabel={dict.story.busy}
          errorLabel={dict.story.error}
        />
      </div>

      {location && (
        <div className="-mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/${lang}/map?lat=${location.lat}&lng=${location.lng}&review=${review.id}`}
            className="rounded-full border border-zinc-300 px-3 py-1.5 font-medium hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
          >
            📍 {dict.map.seeOnMap}
          </Link>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:underline"
          >
            {dict.map.openInMaps} ↗
          </a>
        </div>
      )}

      <section id="likes" className="flex scroll-mt-24 flex-col gap-3">
        <h2 className="text-xl font-semibold">
          ♥ {dict.reviewPage.likedBy}{" "}
          {likers.length > 0 && <span className="text-zinc-500">({likers.length})</span>}
        </h2>
        {likers.length === 0 ? (
          <p className="text-zinc-500">{dict.reviewPage.noLikes}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {likers.map((p) => (
              <li key={p.username}>
                <Link
                  href={`/${lang}/u/${p.username}`}
                  className="flex items-center gap-2 rounded-full border border-zinc-200 py-1 pl-1 pr-3 text-sm hover:border-rose-300 hover:bg-rose-50 dark:border-zinc-800 dark:hover:border-rose-900 dark:hover:bg-rose-950/40"
                >
                  <Avatar url={p.avatar_url} name={p.username} size={24} />
                  {p.display_name || `@${p.username}`}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="comments" className="flex scroll-mt-24 flex-col gap-4">
        <h2 className="text-xl font-semibold">
          {t.title} {comments.length > 0 && <span className="text-zinc-500">({comments.length})</span>}
        </h2>
        {comments.length === 0 ? (
          <p className="text-zinc-500">{t.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {comments.map((c) => {
              const username = c.author?.username ?? "?";
              const canDelete = viewer.id !== null && (viewer.id === c.user_id || reviewAuthor);
              return (
                <li key={c.id} className="flex gap-3 py-3">
                  <Link href={`/${lang}/u/${username}`}>
                    <Avatar url={c.author?.avatar_url} name={username} size={32} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-3 text-sm">
                      <Link href={`/${lang}/u/${username}`} className="font-medium hover:underline">
                        {c.author?.display_name || `@${username}`}
                      </Link>
                      <time className="text-zinc-500" dateTime={c.created_at}>
                        {formatDate(c.created_at, lang)}
                      </time>
                      {canDelete && (
                        <form action={deleteComment}>
                          <input type="hidden" name="lang" value={lang} />
                          <input type="hidden" name="commentId" value={c.id} />
                          <input type="hidden" name="reviewId" value={review.id} />
                          <ConfirmButton
                            label={t.delete}
                            confirmText={t.confirmDelete}
                            className="cursor-pointer text-zinc-500 hover:text-red-600 hover:underline"
                          />
                        </form>
                      )}
                      {viewer.id && viewer.id !== c.user_id && (
                        <ReportButton lang={lang} targetType="comment" targetId={c.id} t={dict.report} compact />
                      )}
                    </div>
                    <p className="whitespace-pre-line break-words">
                      <MentionText text={splitSticker(c.body).text} lang={lang} />
                    </p>
                    {splitSticker(c.body).sticker && (
                      <div className="py-1">
                        <Sticker a={splitSticker(c.body).sticker!} lang={lang} size="sm" />
                      </div>
                    )}
                    <CommentReactions
                      commentId={c.id}
                      initial={reactions[c.id] ?? { counts: {}, mine: null }}
                      signedIn={viewer.id !== null}
                      lang={lang}
                      t={dict.reactions}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {viewer.id ? (
          <CommentForm lang={lang} reviewId={review.id} t={t} />
        ) : (
          <Link href={`/${lang}/login`} className="underline">
            {t.signIn}
          </Link>
        )}
      </section>
    </div>
  );
}

export default async function ReviewPage({ params }: PageProps<"/[lang]/r/[id]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Suspense fallback={<ReviewSkeletons count={1} />}>
        {params.then(({ lang, id }) => {
          if (!hasLocale(lang)) notFound();
          return <ReviewContent lang={lang} id={id} />;
        })}
      </Suspense>
    </div>
  );
}
