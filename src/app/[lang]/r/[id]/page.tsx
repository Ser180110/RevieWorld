import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getComments, getReview, getViewer } from "@/lib/data/queries";
import { deleteComment } from "@/lib/social/actions";
import { fill, formatDate } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { CommentForm } from "@/components/CommentForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ReviewCard } from "@/components/ReviewCard";

export async function generateMetadata({ params }: PageProps<"/[lang]/r/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const review = await getReview(id);
  if (!review || !hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const name = review.author?.display_name || `@${review.author?.username ?? "?"}`;
  return { title: `${review.item?.name ?? ""} · ${fill(dict.reviewPage.title, { name })}` };
}

async function ReviewContent({ lang, id }: { lang: Locale; id: string }) {
  const dict = await getDictionary(lang);
  const t = dict.comments;
  const review = await getReview(id);
  if (!review || !review.item?.category) notFound();
  const [comments, viewer] = await Promise.all([getComments(review.id), getViewer([review])]);
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
        spoilerLabel={dict.reviewForm.spoiler}
      />

      <section id="comments" className="flex scroll-mt-8 flex-col gap-4">
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
                    </div>
                    <p className="whitespace-pre-line break-words">{c.body}</p>
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
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {params.then(({ lang, id }) => {
          if (!hasLocale(lang)) notFound();
          return <ReviewContent lang={lang} id={id} />;
        })}
      </Suspense>
    </div>
  );
}
