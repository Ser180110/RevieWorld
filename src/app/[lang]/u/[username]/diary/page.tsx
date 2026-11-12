import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getProfile, getProfileStats, getUserReviews, getViewer, isFollowingUser } from "@/lib/data/queries";
import type { ReviewRow } from "@/lib/data/types";
import { fill } from "@/lib/format";
import { DeleteReviewButton } from "@/components/DeleteReviewButton";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Stars } from "@/components/Stars";

export async function generateMetadata({ params }: PageProps<"/[lang]/u/[username]/diary">): Promise<Metadata> {
  const { lang, username } = await params;
  const name = `@${decodeURIComponent(username)}`;
  if (!hasLocale(lang)) return { title: name };
  const dict = await getDictionary(lang);
  return { title: fill(dict.diary.title, { name }) };
}

/** Reviews grouped by month, newest first: [["2026-11", [...]], ...]. */
function byMonth(reviews: ReviewRow[]): [string, ReviewRow[]][] {
  const groups = new Map<string, ReviewRow[]>();
  for (const r of reviews) {
    const key = r.created_at.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups];
}

async function DiaryContent({ lang, username }: { lang: Locale; username: string }) {
  const dict = await getDictionary(lang);
  const t = dict.diary;
  const profile = await getProfile(username);
  if (!profile) notFound();

  const [stats, reviews] = await Promise.all([getProfileStats(profile.id), getUserReviews(profile.id)]);
  const viewer = await getViewer([]);
  const following = await isFollowingUser(viewer.id, profile.id);
  const own = viewer.id === profile.id;
  const monthName = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric", timeZone: "UTC" });
  const back = `/${lang}/u/${profile.username}/diary`;

  return (
    <div className="flex flex-col gap-8">
      <ProfileHeader
        profile={profile}
        stats={stats}
        viewerId={viewer.id}
        following={following}
        active="diary"
        lang={lang}
        t={dict.profile}
      />

      {reviews.length === 0 ? (
        <p className="text-zinc-500">{t.empty}</p>
      ) : (
        <div className="flex flex-col gap-8">
          <p className="text-sm text-zinc-500">{reviews.length === 1 ? t.totalOne : fill(t.total, { n: String(reviews.length) })}</p>
          {byMonth(reviews).map(([month, entries]) => (
            <section key={month} className="flex flex-col">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {monthName.format(new Date(`${month}-01T00:00:00Z`))}
              </h2>
              <ol className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {entries.map((r) => {
                  const item = r.item;
                  const href = item?.category ? `/${lang}/c/${item.category.slug}/${item.slug}` : null;
                  return (
                    <li key={r.id} className="flex items-center gap-4 py-3">
                      <time
                        dateTime={r.created_at}
                        className="w-10 shrink-0 text-center text-2xl font-semibold tabular-nums text-zinc-400"
                      >
                        {new Date(r.created_at).getUTCDate()}
                      </time>
                      <div className="flex min-w-0 flex-1 flex-col">
                        {href ? (
                          <Link href={href} className="truncate font-semibold hover:underline">
                            {item?.name}
                          </Link>
                        ) : (
                          <span className="truncate font-semibold">{item?.name ?? "?"}</span>
                        )}
                        {item?.category && (
                          <Link
                            href={`/${lang}/c/${item.category.slug}`}
                            className="truncate text-sm text-zinc-500 hover:underline"
                          >
                            {item.category.name}
                          </Link>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Stars rating={r.rating} />
                        <span className="flex items-center gap-3 text-xs text-zinc-500">
                          {r.body && <span title={dict.item.reviewsTitle}>✎</span>}
                          {r.likes_count > 0 && <span title={t.likes}>♥ {r.likes_count}</span>}
                        </span>
                      </div>
                      {own && (
                        <DeleteReviewButton
                          reviewId={r.id}
                          lang={lang}
                          back={back}
                          label="✕"
                          confirmText={dict.reviewCard.confirmDelete}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function DiaryPage({ params }: PageProps<"/[lang]/u/[username]/diary">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {params.then(({ lang, username }) => {
          if (!hasLocale(lang)) notFound();
          return <DiaryContent lang={lang} username={decodeURIComponent(username)} />;
        })}
      </Suspense>
    </div>
  );
}
