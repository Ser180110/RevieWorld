import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getCategory,
  getCategoryItems,
  getCurrentUserId,
  isFollowing,
} from "@/lib/data/queries";
import { setFollow } from "@/lib/reviews/actions";
import { count, fill, formatStars } from "@/lib/format";
import { ReviewForm } from "@/components/ReviewForm";

async function CategoryContent({ lang, slug }: { lang: Locale; slug: string }) {
  const dict = await getDictionary(lang);
  const t = dict.category;
  const category = await getCategory(decodeURIComponent(slug));
  if (!category) notFound();

  const [items, userId] = await Promise.all([getCategoryItems(category.id), getCurrentUserId()]);
  const following = await isFollowing(category.id, userId);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="text-zinc-600 dark:text-zinc-400">{category.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <span>
            {count(category.items_count, dict.common.item, dict.common.items)}
          </span>
          <span>
            {count(category.reviews_count, dict.common.review, dict.common.reviews)}
          </span>
          <span>
            {count(category.followers_count, dict.common.follower, dict.common.followers)}
          </span>
          <form action={setFollow}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="categoryId" value={category.id} />
            <input type="hidden" name="slug" value={category.slug} />
            <input type="hidden" name="follow" value={following ? "0" : "1"} />
            <button
              type="submit"
              title={following ? t.unfollow : undefined}
              className={
                following
                  ? "rounded-full border border-zinc-300 px-4 py-1.5 font-medium text-zinc-900 hover:border-red-500 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-100"
                  : "rounded-full bg-zinc-900 px-4 py-1.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
              }
            >
              {following ? t.following : t.follow}
            </button>
          </form>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t.itemsTitle}</h2>
        {items.length === 0 ? (
          <p className="text-zinc-500">{t.itemsEmpty}</p>
        ) : (
          <ol className="flex flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {items.map((item, i) => (
              <li key={item.id}>
                <Link
                  href={`/${lang}/c/${category.slug}/${item.slug}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span className="w-6 text-right text-sm tabular-nums text-zinc-400">{i + 1}</span>
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="text-sm tabular-nums">★ {formatStars(item.avg_rating)}</span>
                  <span className="w-24 text-right text-sm text-zinc-500">
                    {count(item.reviews_count, dict.common.review, dict.common.reviews)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-xl font-semibold">{fill(t.reviewSomething, { name: category.name })}</h2>
        {userId ? (
          <ReviewForm
            lang={lang}
            categoryId={category.id}
            categorySlug={category.slug}
            t={dict.reviewForm}
            common={dict.common}
          />
        ) : (
          <Link href={`/${lang}/login`} className="underline">
            {dict.common.signInToContinue}
          </Link>
        )}
      </section>
    </div>
  );
}

export default async function CategoryPage({ params }: PageProps<"/[lang]/c/[slug]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {params.then(({ lang, slug }) => {
          if (!hasLocale(lang)) notFound();
          return <CategoryContent lang={lang} slug={slug} />;
        })}
      </Suspense>
    </div>
  );
}
