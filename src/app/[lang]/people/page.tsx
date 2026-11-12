import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getCurrentUserId,
  getFollowedIds,
  searchProfiles,
} from "@/lib/data/queries";
import { fill } from "@/lib/format";
import { PersonRow } from "@/components/PersonRow";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/people">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).people.title };
}

async function Results({ lang, q }: { lang: Locale; q: string }) {
  const dict = await getDictionary(lang);
  const t = dict.people;
  const [people, viewerId] = await Promise.all([
    searchProfiles(q),
    getCurrentUserId(),
  ]);
  const followed = await getFollowedIds(
    viewerId,
    people.map((p) => p.id),
  );
  const back = `/${lang}/people${q ? `?q=${encodeURIComponent(q)}` : ""}`;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {q ? fill(t.results, { q }) : t.newest}
      </h2>
      {people.length === 0 ? (
        <p className="text-zinc-500">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {people.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              lang={lang}
              viewerId={viewerId}
              following={followed.includes(p.id)}
              back={back}
              t={dict.profile}
              youLabel={t.you}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function PeoplePage({
  params,
  searchParams,
}: PageProps<"/[lang]/people">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.people;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
      <Suspense
        fallback={<p className="text-zinc-500">{dict.common.loading}</p>}
      >
        {searchParams.then((sp) => {
          const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 40) : "";
          return (
            <>
              <form action={`/${lang}/people`} className="flex gap-2">
                <label className="sr-only" htmlFor="people-q">
                  {t.searchLabel}
                </label>
                <input
                  id="people-q"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder={t.searchPlaceholder}
                  className="h-11 flex-1 rounded-full border border-zinc-300 bg-transparent px-4 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
                />
                <button
                  type="submit"
                  className="h-11 cursor-pointer rounded-full bg-zinc-900 px-5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {t.search}
                </button>
              </form>
              <Results lang={lang} q={q} />
            </>
          );
        })}
      </Suspense>
    </div>
  );
}
