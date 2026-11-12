import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCategory, getCurrentUserId, getItem, getItemReviews } from "@/lib/data/queries";
import { count, formatStars } from "@/lib/format";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewForm } from "@/components/ReviewForm";
import { Stars } from "@/components/Stars";

async function ItemContent({ lang, slug, itemSlug }: { lang: Locale; slug: string; itemSlug: string }) {
  const dict = await getDictionary(lang);
  const t = dict.item;
  const category = await getCategory(decodeURIComponent(slug));
  if (!category) notFound();
  const item = await getItem(category.id, decodeURIComponent(itemSlug));
  if (!item) notFound();

  const [reviews, userId] = await Promise.all([getItemReviews(item.id), getCurrentUserId()]);
  const mine = userId ? reviews.find((r) => r.user_id === userId) : undefined;
  const avg = item.avg_rating === null ? null : Number(item.avg_rating);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <Link href={`/${lang}/c/${category.slug}`} className="text-sm text-zinc-500 hover:underline">
          ← {category.name}
        </Link>
        <h1 className="text-4xl font-semibold tracking-tight">{item.name}</h1>
        <div className="flex items-center gap-3">
          {avg !== null ? (
            <>
              <Stars rating={Math.round(avg)} size="text-2xl" />
              <span className="text-2xl font-semibold tabular-nums">{formatStars(avg)}</span>
              <span className="text-sm text-zinc-500">
                {t.average} · {count(item.reviews_count, dict.common.review, dict.common.reviews)}
              </span>
            </>
          ) : (
            <span className="text-zinc-500">{dict.common.noRating}</span>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-xl font-semibold">{dict.reviewForm.yourReview}</h2>
        {userId ? (
          <ReviewForm
            lang={lang}
            categoryId={category.id}
            categorySlug={category.slug}
            item={{ id: item.id, name: item.name }}
            existing={mine}
            t={dict.reviewForm}
            common={dict.common}
          />
        ) : (
          <Link href={`/${lang}/login`} className="underline">
            {dict.common.signInToContinue}
          </Link>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t.reviewsTitle}</h2>
        {reviews.length === 0 ? (
          <p className="text-zinc-500">{t.reviewsEmpty}</p>
        ) : (
          reviews.map((r) => (
            <ReviewCard key={r.id} review={r} lang={lang} spoilerLabel={dict.reviewForm.spoiler} />
          ))
        )}
      </section>
    </div>
  );
}

export default async function ItemPage({ params }: PageProps<"/[lang]/c/[slug]/[item]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {params.then(({ lang, slug, item }) => {
          if (!hasLocale(lang)) notFound();
          return <ItemContent lang={lang} slug={slug} itemSlug={item} />;
        })}
      </Suspense>
    </div>
  );
}
