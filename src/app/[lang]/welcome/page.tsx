import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId, getMainCategories, getSuggestedPeople } from "@/lib/data/queries";
import { finishWelcome } from "@/lib/social/actions";
import { styleOf } from "@/lib/categoryStyle";
import { count } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

export async function generateMetadata({ params }: PageProps<"/[lang]/welcome">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).welcome.title, robots: { index: false } };
}

/** First steps after signing up: pick categories and people, so home isn't empty. */
async function Welcome({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);
  const t = dict.welcome;
  const userId = await getCurrentUserId();
  if (!userId) redirect(`/${lang}/login`);
  const [categories, people] = await Promise.all([getMainCategories(24), getSuggestedPeople(userId, 8)]);

  return (
    <form action={finishWelcome} className="flex flex-col gap-10">
      <input type="hidden" name="lang" value={lang} />

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">1. {t.categoriesTitle}</h2>
        <p className="text-sm text-zinc-500">{t.categoriesHint}</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const style = styleOf(c);
            return (
              <label key={c.id} className="cursor-pointer">
                <input type="checkbox" name="category" value={c.id} className="peer sr-only" />
                <span className="flex items-center gap-2 rounded-full border-2 border-zinc-200 px-4 py-2 font-medium transition peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 dark:border-zinc-800 dark:peer-checked:border-zinc-100 dark:peer-checked:bg-zinc-100 dark:peer-checked:text-zinc-900">
                  <span aria-hidden>{style.emoji}</span>
                  {c.name}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {people.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">2. {t.peopleTitle}</h2>
          <p className="text-sm text-zinc-500">{t.peopleHint}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {people.map((p) => (
              <li key={p.id}>
                <label className="group cursor-pointer">
                  <input type="checkbox" name="person" value={p.id} className="peer sr-only" />
                  <span className="flex items-center gap-3 rounded-2xl border-2 border-zinc-200 p-3 transition peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 dark:border-zinc-800 dark:peer-checked:bg-emerald-950/40">
                    <Avatar url={p.avatar_url} name={p.username} size={40} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">{p.display_name || `@${p.username}`}</span>
                      <span className="text-sm text-zinc-500">{count(p.reviews, dict.common.review, dict.common.reviews)}</span>
                    </span>
                    <span className="text-sm font-medium text-zinc-500 group-has-[:checked]:hidden">{t.follow}</span>
                    <span className="hidden text-sm font-semibold text-emerald-600 group-has-[:checked]:inline">✓ {t.following}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="h-12 cursor-pointer rounded-full bg-zinc-900 px-8 font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t.start}
        </button>
        <Link href={`/${lang}?feed=all`} className="text-sm text-zinc-500 hover:underline">
          {t.skip}
        </Link>
      </div>
    </form>
  );
}

export default async function WelcomePage({ params }: PageProps<"/[lang]/welcome">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight">👋 {dict.welcome.title}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">{dict.welcome.subtitle}</p>
      </div>
      <Suspense fallback={<p className="text-zinc-500">{dict.common.loading}</p>}>
        <Welcome lang={lang} />
      </Suspense>
    </div>
  );
}
