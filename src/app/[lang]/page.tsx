import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { getRecentReviews, getTopCategories } from "@/lib/data/queries";
import { ReviewCard } from "@/components/ReviewCard";

async function RecentReviews({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const reviews = await getRecentReviews();
  if (!reviews.length) return <p className="text-zinc-500">{dict.home.recentEmpty}</p>;
  return (
    <div>
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} lang={lang} showItem spoilerLabel={dict.reviewForm.spoiler} />
      ))}
    </div>
  );
}

async function TopCategories({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const categories = await getTopCategories();
  if (!categories.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{dict.home.topCategoriesTitle}</h2>
      <ul className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/${lang}/c/${c.slug}`}
              className="inline-flex items-baseline gap-2 rounded-full border border-zinc-300 px-4 py-1.5 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-zinc-500">{c.reviews_count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.home;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 px-4 py-16 sm:py-24">
      <section className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.headline}</h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">{t.subheadline}</p>
      </section>

      <form role="search" className="flex flex-col gap-2 sm:flex-row" action={`/${lang}/new`}>
        <label htmlFor="q" className="sr-only">
          {t.searchLabel}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          required
          minLength={2}
          placeholder={t.searchPlaceholder}
          className="h-12 flex-1 rounded-full border border-zinc-300 bg-transparent px-5 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
        />
        <button
          type="submit"
          className="h-12 rounded-full bg-zinc-900 px-6 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {t.searchButton}
        </button>
      </form>

      <Suspense fallback={null}>
        <TopCategories lang={lang} dict={dict} />
      </Suspense>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t.recentTitle}</h2>
        <Suspense fallback={<p className="text-zinc-500">{dict.common.loading}</p>}>
          <RecentReviews lang={lang} dict={dict} />
        </Suspense>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t.howTitle}</h2>
        <ol className="list-decimal space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
          {t.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
