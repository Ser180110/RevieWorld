import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import {
  getListPreviews,
  getRecentLists,
  getRecentReviews,
  getTopCategories,
  getViewer,
} from "@/lib/data/queries";
import { ListCard } from "@/components/ListCard";
import { CategoryTile } from "@/components/CategoryTile";
import { ActivityFeed } from "@/components/ActivityFeed";
import { getCurrentUserId } from "@/lib/data/queries";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewSkeletons } from "@/components/Skeletons";

async function RecentReviews({
  lang,
  dict,
}: {
  lang: Locale;
  dict: Dictionary;
}) {
  const reviews = await getRecentReviews();
  if (!reviews.length)
    return <p className="text-zinc-500">{dict.home.recentEmpty}</p>;
  const viewer = await getViewer(reviews);
  return (
    <div>
      {reviews.map((r) => (
        <ReviewCard
          key={r.id}
          review={r}
          lang={lang}
          showItem
          viewer={viewer}
          back={`/${lang}`}
          t={dict.reviewCard}
          spoilerLabel={dict.reviewForm.spoiler}
        />
      ))}
    </div>
  );
}

async function RecentLists({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const lists = await getRecentLists();
  if (!lists.length) return null;
  const previews = await getListPreviews(lists.map((l) => l.id));
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{dict.lists.recentTitle}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((l) => (
          <ListCard
            key={l.id}
            list={l}
            preview={previews[l.id] ?? []}
            lang={lang}
            showOwner
            t={dict.lists}
          />
        ))}
      </div>
    </section>
  );
}

async function HomeActivity({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const feed = await ActivityFeed({ lang, dict, userId, limit: 5, compact: true });
  if (!feed) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{dict.activity.homeTitle}</h2>
      {feed}
    </section>
  );
}

async function TopCategories({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const categories = await getTopCategories(8);
  if (!categories.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold">{dict.home.topCategoriesTitle}</h2>
        <Link href={`/${lang}/categories`} className="text-sm font-medium hover:underline">
          {dict.home.seeAllCategories}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((c) => (
          <CategoryTile key={c.id} category={c} lang={lang} reviewsLabel={dict.common.reviews} />
        ))}
      </div>
    </section>
  );
}

const HERO_EMOJI = ["🍕", "🎬", "🚽", "🍔", "🎧", "☕", "🏖️", "📚", "🎮"];

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.home;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 px-4 py-8 sm:py-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 px-6 py-10 text-white shadow-xl shadow-fuchsia-500/20 sm:px-10 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-4 grid select-none grid-cols-3 gap-3 text-4xl opacity-30 sm:text-6xl sm:opacity-30"
        >
          {HERO_EMOJI.map((e) => (
            <span key={e} className="rotate-12">
              {e}
            </span>
          ))}
        </div>
        <div className="relative flex flex-col gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight drop-shadow-sm sm:text-5xl">{t.headline}</h1>
          <p className="max-w-xl text-lg text-white/90">{t.subheadline}</p>
          <form role="search" className="mt-2 flex flex-col gap-2 sm:flex-row" action={`/${lang}/new`}>
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
              className="h-12 min-w-0 shrink-0 rounded-full bg-white px-5 text-zinc-900 shadow-sm outline-none ring-white/60 placeholder:text-zinc-400 focus:ring-4 sm:flex-1"
            />
            <button
              type="submit"
              className="h-12 cursor-pointer rounded-full bg-zinc-900 px-6 font-semibold text-white shadow-sm transition hover:bg-zinc-800 active:scale-95"
            >
              {t.searchButton} →
            </button>
          </form>
        </div>
      </section>

      <Suspense fallback={null}>
        <HomeActivity lang={lang} dict={dict} />
      </Suspense>

      <Suspense fallback={null}>
        <TopCategories lang={lang} dict={dict} />
      </Suspense>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{t.recentTitle}</h2>
        <Suspense fallback={<ReviewSkeletons />}>
          <RecentReviews lang={lang} dict={dict} />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <RecentLists lang={lang} dict={dict} />
      </Suspense>

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
