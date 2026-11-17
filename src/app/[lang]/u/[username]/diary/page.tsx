import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getDiaryMonth,
  getProfile,
  getProfileStats,
  getUserReviews,
  getViewer,
  isFollowingUser,
  todayInRome,
} from "@/lib/data/queries";
import type { DiaryEntry, ReviewRow } from "@/lib/data/types";
import type { Dictionary } from "@/i18n/dictionaries";
import { styleOf } from "@/lib/categoryStyle";
import { deleteDiaryEntry } from "@/lib/reviews/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { fill } from "@/lib/format";
import { DeleteReviewButton } from "@/components/DeleteReviewButton";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Stars } from "@/components/Stars";
import {
  RatingHistogram,
  ratingFilterOf,
  starsText,
} from "@/components/RatingHistogram";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/u/[username]/diary">): Promise<Metadata> {
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

/** "2026-11" from ?month=, or null. */
function monthOf(value: unknown): string | null {
  return typeof value === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
    value >= "1900-01"
    ? value
    : null;
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function emojiOf(e: DiaryEntry): string {
  return e.item?.category ? styleOf(e.item.category).emoji : "⭐";
}

/** The month as a calendar: each day shows the emoji of what was tried. */
function DiaryCalendar({
  month,
  today,
  entries,
  weekdays,
}: {
  month: string;
  today: string;
  entries: DiaryEntry[];
  weekdays: string[];
}) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const byDay = new Map<number, DiaryEntry[]>();
  for (const e of entries) {
    const d = Number(e.experienced_on.slice(8, 10));
    byDay.set(d, [...(byDay.get(d) ?? []), e]);
  }
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  return (
    <div className="grid grid-cols-7 gap-1 text-center">
      {weekdays.map((w) => (
        <div
          key={w}
          className="pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500"
        >
          {w}
        </div>
      ))}
      {cells.map((d, i) => {
        if (d === null) return <div key={`x${i}`} />;
        const list = byDay.get(d) ?? [];
        const isToday = `${month}-${String(d).padStart(2, "0")}` === today;
        const body = (
          <>
            <span
              className={`text-xs tabular-nums ${isToday ? "rounded-full bg-zinc-900 px-1.5 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500"}`}
            >
              {d}
            </span>
            <span className="flex flex-wrap items-center justify-center text-base leading-tight sm:text-xl">
              {list.slice(0, 2).map((e) => (
                <span key={e.id}>{emojiOf(e)}</span>
              ))}
              {list.length > 2 && (
                <span className="text-[10px] font-semibold text-zinc-500">
                  +{list.length - 2}
                </span>
              )}
            </span>
          </>
        );
        const cls =
          "flex aspect-square min-w-0 flex-col items-center justify-start gap-0.5 rounded-lg p-1";
        return list.length > 0 ? (
          <a
            key={d}
            href={`#day-${d}`}
            className={`${cls} bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50`}
          >
            {body}
          </a>
        ) : (
          <div key={d} className={`${cls} bg-zinc-50 dark:bg-zinc-900/60`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** The month's entries, day by day ("Provato" / "Riprovato"). */
function DiaryDays({
  lang,
  entries,
  own,
  back,
  dict,
}: {
  lang: Locale;
  entries: DiaryEntry[];
  own: boolean;
  back: string;
  dict: Dictionary;
}) {
  const t = dict.diary;
  const weekday = new Intl.DateTimeFormat(lang, {
    weekday: "short",
    timeZone: "UTC",
  });
  return (
    <ol className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {entries.map((e, i) => {
        const item = e.item;
        const href = item?.category
          ? `/${lang}/c/${item.category.slug}/${item.slug}`
          : null;
        const date = new Date(`${e.experienced_on}T00:00:00Z`);
        const first = i === 0 || entries[i - 1].experienced_on !== e.experienced_on;
        return (
          <li
            key={e.id}
            id={first ? `day-${date.getUTCDate()}` : undefined}
            className="flex scroll-mt-20 items-center gap-4 py-3"
          >
            <time
              dateTime={e.experienced_on}
              className="flex w-10 shrink-0 flex-col items-center leading-none"
            >
              {first && (
                <>
                  <span className="text-2xl font-semibold tabular-nums text-zinc-400">
                    {date.getUTCDate()}
                  </span>
                  <span className="text-[10px] uppercase text-zinc-400">
                    {weekday.format(date)}
                  </span>
                </>
              )}
            </time>
            <span className="text-xl" aria-hidden>
              {emojiOf(e)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              {href ? (
                <Link
                  href={href}
                  className="truncate font-semibold hover:underline"
                >
                  {item?.name}
                </Link>
              ) : (
                <span className="truncate font-semibold">
                  {item?.name ?? "?"}
                </span>
              )}
              <span className="flex flex-wrap items-center gap-x-2 text-sm text-zinc-500">
                <span
                  className={
                    e.review_id
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-sky-700 dark:text-sky-400"
                  }
                >
                  {e.review_id ? `✅ ${t.tried}` : `🔁 ${t.again}`}
                </span>
                {item?.category && (
                  <Link
                    href={`/${lang}/c/${item.category.slug}`}
                    className="truncate hover:underline"
                  >
                    · {item.category.name}
                  </Link>
                )}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Stars rating={e.rating} />
              <span className="flex items-center gap-3 text-xs text-zinc-500">
                {e.review?.body && (
                  <span title={dict.item.reviewsTitle}>≡</span>
                )}
                {(e.review?.likes_count ?? 0) > 0 && (
                  <span title={t.likes}>♥ {e.review?.likes_count}</span>
                )}
              </span>
            </div>
            {own && e.review_id && (
              <Link
                href={`/${lang}/r/${e.review_id}/edit?back=${encodeURIComponent(back)}`}
                className="rounded-full px-2 py-0.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                {dict.reviewCard.edit}
              </Link>
            )}
            {own && !e.review_id && (
              <form action={deleteDiaryEntry}>
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="entryId" value={e.id} />
                <input type="hidden" name="back" value={back} />
                <ConfirmButton
                  label="✕"
                  okLabel={dict.quickLog.remove}
                  confirmText={t.confirmRemove}
                  className="rounded-full px-2 py-0.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                />
              </form>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** With a rating filter: the reviews with those stars, month by month. */
function RatingList({
  lang,
  reviews,
  own,
  back,
  dict,
  monthName,
}: {
  lang: Locale;
  reviews: ReviewRow[];
  own: boolean;
  back: string;
  dict: Dictionary;
  monthName: Intl.DateTimeFormat;
}) {
  const t = dict.diary;
  return (
    <div className="flex flex-col gap-8">
      {byMonth(reviews).map(([month, entries]) => (
        <section key={month} className="flex flex-col">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {monthName.format(new Date(`${month}-01T00:00:00Z`))}
          </h2>
          <ol className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {entries.map((r) => {
              const item = r.item;
              const href = item?.category
                ? `/${lang}/c/${item.category.slug}/${item.slug}`
                : null;
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
                      <Link
                        href={href}
                        className="truncate font-semibold hover:underline"
                      >
                        {item?.name}
                      </Link>
                    ) : (
                      <span className="truncate font-semibold">
                        {item?.name ?? "?"}
                      </span>
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
                      {r.body && <span title={dict.item.reviewsTitle}>≡</span>}
                      {r.likes_count > 0 && (
                        <span title={t.likes}>♥ {r.likes_count}</span>
                      )}
                    </span>
                  </div>
                  {own && (
                    <Link
                      href={`/${lang}/r/${r.id}/edit?back=${encodeURIComponent(back)}`}
                      title={dict.reviewCard.edit}
                      aria-label={dict.reviewCard.edit}
                      className="rounded-full px-2 py-0.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                      {dict.reviewCard.edit}
                    </Link>
                  )}
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
  );
}

async function DiaryContent({
  lang,
  username,
  rating,
  month: wanted,
}: {
  lang: Locale;
  username: string;
  rating: number | null;
  month: string | null;
}) {
  const dict = await getDictionary(lang);
  const t = dict.diary;
  const profile = await getProfile(username);
  if (!profile) notFound();

  const [stats, allReviews] = await Promise.all([
    getProfileStats(profile.id),
    getUserReviews(profile.id),
  ]);
  const viewer = await getViewer([]);
  const following = await isFollowingUser(viewer.id, profile.id);
  const own = viewer.id === profile.id;
  const monthName = new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const base = `/${lang}/u/${profile.username}/diary`;
  const today = todayInRome();
  const thisMonth = today.slice(0, 7);
  const month = wanted && wanted <= thisMonth ? wanted : thisMonth;
  const diary = rating ? null : await getDiaryMonth(profile.id, month);
  const monthHref = (mm: string) =>
    mm === thisMonth ? base : `${base}?month=${mm}`;
  const monthBack = monthHref(month);
  const back = rating ? `${base}?rating=${rating}` : base;
  const counts = Array<number>(10).fill(0);
  for (const r of allReviews)
    if (r.rating >= 1 && r.rating <= 10) counts[r.rating - 1] += 1;
  const reviews = rating
    ? allReviews.filter((r) => r.rating === rating)
    : allReviews;
  const name = profile.display_name || `@${profile.username}`;

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

      <RatingHistogram
        counts={counts}
        title={dict.ratings.title}
        votesLabel={dict.ratings.votes}
        hint={dict.ratings.hint}
        active={rating}
        hrefs={counts.map((_, i) =>
          rating === i + 1 ? base : `${base}?rating=${i + 1}`,
        )}
      />

      {rating && (
        <p className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">
            {fill(dict.ratings.showing, { stars: starsText(rating) })} (
            {reviews.length})
          </span>
          <Link
            href={base}
            scroll={false}
            className="text-zinc-500 hover:underline"
          >
            {dict.ratings.showAll}
          </Link>
        </p>
      )}

      {rating ? (
        reviews.length === 0 ? (
          <p className="text-zinc-500">
            {own
              ? fill(dict.ratings.noneMine, { stars: starsText(rating) })
              : fill(dict.ratings.noneUser, { name, stars: starsText(rating) })}
          </p>
        ) : (
          <RatingList
            lang={lang}
            reviews={reviews}
            own={own}
            back={back}
            dict={dict}
            monthName={monthName}
          />
        )
      ) : (
        diary && (
          <section className="flex flex-col gap-4">
            <nav className="flex items-center justify-between gap-2">
              <Link
                href={monthHref(shiftMonth(month, -1))}
                scroll={false}
                aria-label={t.prev}
                title={t.prev}
                className="rounded-full px-3 py-1 text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ‹
              </Link>
              <h2 className="text-center text-lg font-semibold capitalize">
                {monthName.format(new Date(`${month}-01T00:00:00Z`))}
              </h2>
              {month < thisMonth ? (
                <Link
                  href={monthHref(shiftMonth(month, 1))}
                  scroll={false}
                  aria-label={t.next}
                  title={t.next}
                  className="rounded-full px-3 py-1 text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ›
                </Link>
              ) : (
                <span className="w-10" />
              )}
            </nav>
            <DiaryCalendar
              month={month}
              today={today}
              entries={diary.entries}
              weekdays={t.weekdays}
            />
            {diary.entries.length === 0 ? (
              <p className="flex flex-wrap gap-3 text-zinc-500">
                {diary.total === 0 ? t.empty : t.monthEmpty}
                {diary.latest && diary.latest !== month && (
                  <Link
                    href={monthHref(diary.latest)}
                    scroll={false}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {fill(t.goLatest, {
                      month: monthName.format(
                        new Date(`${diary.latest}-01T00:00:00Z`),
                      ),
                    })}{" "}
                    →
                  </Link>
                )}
              </p>
            ) : (
              <>
                <p className="text-sm text-zinc-500">
                  {diary.entries.length === 1
                    ? t.monthCountOne
                    : fill(t.monthCount, { n: String(diary.entries.length) })}
                  {" · "}
                  {diary.total === 1
                    ? t.totalOne
                    : fill(t.total, { n: String(diary.total) })}
                </p>
                <DiaryDays
                  lang={lang}
                  entries={diary.entries}
                  own={own}
                  back={monthBack}
                  dict={dict}
                />
              </>
            )}
          </section>
        )
      )}
    </div>
  );
}

export default async function DiaryPage({
  params,
  searchParams,
}: PageProps<"/[lang]/u/[username]/diary">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {Promise.all([params, searchParams]).then(
          ([{ lang, username }, sp]) => {
            if (!hasLocale(lang)) notFound();
            return (
              <DiaryContent
                lang={lang}
                username={decodeURIComponent(username)}
                rating={ratingFilterOf(sp.rating)}
                month={monthOf(sp.month)}
              />
            );
          },
        )}
      </Suspense>
    </div>
  );
}
