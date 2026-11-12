import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { getCurrentUserId, getFollowedIds, searchAll } from "@/lib/data/queries";
import { styleOf } from "@/lib/categoryStyle";
import { count, fill, formatStars } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { CategoryTile } from "@/components/CategoryTile";
import { PersonRow } from "@/components/PersonRow";

const TYPES = ["all", "categories", "items", "people"] as const;
type SearchType = (typeof TYPES)[number];

export async function generateMetadata({ params }: PageProps<"/[lang]/search">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).search.title };
}

async function Results({ lang, q, type }: { lang: Locale; q: string; type: SearchType }) {
  const dict = await getDictionary(lang);
  const t = dict.search;
  if (q.trim().length < 2) return <p className="text-zinc-500">{t.tooShort}</p>;

  const [results, viewerId] = await Promise.all([searchAll(q, type === "all" ? 8 : 40), getCurrentUserId()]);
  const followed = await getFollowedIds(
    viewerId,
    results.people.map((p) => p.id),
  );
  const show = (k: Exclude<SearchType, "all">) => type === "all" || type === k;
  const total = results.categories.length + results.items.length + results.people.length;
  const base = `/${lang}/search?q=${encodeURIComponent(q)}`;

  const tab = (k: SearchType, label: string, n?: number) => (
    <Link
      key={k}
      href={k === "all" ? base : `${base}&type=${k}`}
      aria-current={type === k ? "page" : undefined}
      className={`rounded-full px-3 py-1 text-sm ${
        type === k
          ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      {label}
      {n !== undefined && n > 0 && <span className="ml-1 opacity-60">{n}</span>}
    </Link>
  );

  const heading = (label: string, k: Exclude<SearchType, "all">, n: number) => (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{label}</h2>
      {type === "all" && n >= 8 && (
        <Link href={`${base}&type=${k}`} className="text-sm font-medium hover:underline">
          {t.seeAll}
        </Link>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <nav className="flex flex-wrap gap-2">
        {tab("all", t.all)}
        {tab("categories", t.categories, results.categories.length)}
        {tab("items", t.items, results.items.length)}
        {tab("people", t.people, results.people.length)}
      </nav>

      {total === 0 && <NoResults lang={lang} q={q} t={t} />}

      {show("categories") && results.categories.length > 0 && (
        <section className="flex flex-col gap-3">
          {heading(t.categories, "categories", results.categories.length)}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {results.categories.map((c) => (
              <CategoryTile key={c.id} category={c} lang={lang} reviewsLabel={dict.common.reviews} />
            ))}
          </div>
        </section>
      )}

      {show("items") && results.items.length > 0 && (
        <section className="flex flex-col gap-3">
          {heading(t.items, "items", results.items.length)}
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {results.items.map((item) => {
              const cat = item.category;
              if (!cat) return null;
              const style = styleOf({ name: cat.name, icon: cat.icon, color: cat.color });
              return (
                <li key={item.id}>
                  <Link
                    href={`/${lang}/c/${cat.slug}/${item.slug}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    {item.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl(item.cover)} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span
                        aria-hidden
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl ${style.classes.tile}`}
                      >
                        {style.emoji}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="truncate text-sm text-zinc-500">
                        {style.emoji} {cat.name}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end text-sm">
                      <span className="tabular-nums">★ {formatStars(item.avg_rating)}</span>
                      <span className="text-xs text-zinc-500">
                        {count(item.reviews_count, dict.common.review, dict.common.reviews)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {show("people") && results.people.length > 0 && (
        <section className="flex flex-col gap-1">
          {heading(t.people, "people", results.people.length)}
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {results.people.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                lang={lang}
                viewerId={viewerId}
                following={followed.includes(p.id)}
                back={type === "all" ? base : `${base}&type=${type}`}
                t={dict.profile}
                youLabel={dict.people.you}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function NoResults({ lang, q, t }: { lang: Locale; q: string; t: Dictionary["search"] }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
      <p className="text-zinc-600 dark:text-zinc-400">{fill(t.empty, { q })}</p>
      <Link
        href={`/${lang}/new?q=${encodeURIComponent(q)}`}
        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {fill(t.create, { q })}
      </Link>
    </div>
  );
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.search;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
      <Suspense fallback={<p className="text-zinc-500">{dict.common.loading}</p>}>
        {searchParams.then((sp) => {
          const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
          const type: SearchType = TYPES.includes(sp.type as SearchType) ? (sp.type as SearchType) : "all";
          return (
            <>
              <form action={`/${lang}/search`} role="search" className="flex gap-2">
                {type !== "all" && <input type="hidden" name="type" value={type} />}
                <label htmlFor="search-page" className="sr-only">
                  {t.label}
                </label>
                <input
                  id="search-page"
                  name="q"
                  type="search"
                  defaultValue={q}
                  autoFocus={!q}
                  placeholder={t.placeholder}
                  className="h-12 min-w-0 flex-1 rounded-full border border-zinc-300 bg-transparent px-5 text-lg outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
                />
                <button
                  type="submit"
                  className="h-12 cursor-pointer rounded-full bg-zinc-900 px-6 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {t.button}
                </button>
              </form>
              {q ? <Results lang={lang} q={q} type={type} /> : <p className="text-zinc-500">{t.hint}</p>}
            </>
          );
        })}
      </Suspense>
    </div>
  );
}
