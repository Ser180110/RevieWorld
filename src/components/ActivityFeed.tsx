import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getActivity, getRecentReviews, getViewer } from "@/lib/data/queries";
import { ReviewCard } from "./ReviewCard";

export type FeedKind = "following" | "all";

/** The /activity link for a tab and page ("Tutti" page 2 = /it/activity?feed=all&page=2). */
export function activityHref(lang: string, feed: FeedKind, page = 1): string {
  const q = [feed === "all" ? "feed=all" : "", page > 1 ? `page=${page}` : ""].filter(Boolean).join("&");
  return `/${lang}/activity${q ? `?${q}` : ""}`;
}

/**
 * Latest reviews, a page at a time: from the people the user follows, or from
 * everyone. On the home page (`home`) it shows one short page and a
 * "Vedi altre" link; on /activity it has "newer / older" links.
 */
export async function ActivityFeed({
  lang,
  dict,
  userId,
  feed = "following",
  limit,
  page = 1,
  home = false,
}: {
  lang: Locale;
  dict: Dictionary;
  userId: string | null;
  feed?: FeedKind;
  limit: number;
  page?: number;
  home?: boolean;
}) {
  const t = dict.activity;
  const offset = (page - 1) * limit;
  // One extra row tells whether there is a next page.
  let reviews;
  let following = -1;
  if (feed === "all" || !userId) {
    reviews = await getRecentReviews(limit + 1, offset);
  } else {
    ({ reviews, following } = await getActivity(userId, limit + 1, offset));
  }
  const hasMore = reviews.length > limit;
  reviews = reviews.slice(0, limit);
  const viewer = await getViewer(reviews);

  if (following === 0) {
    return (
      <p className="text-zinc-500">
        {t.noFollows}{" "}
        <Link href={`/${lang}/people`} className="underline">
          {t.peopleLink}
        </Link>
        .
      </p>
    );
  }
  if (reviews.length === 0) {
    if (page > 1) {
      return (
        <Link href={activityHref(lang, feed)} className="text-sm font-medium hover:underline">
          ← {t.newer}
        </Link>
      );
    }
    return <p className="text-zinc-500">{feed === "all" ? dict.home.recentEmpty : t.empty}</p>;
  }

  const here = home ? `/${lang}${feed === "all" ? "?feed=all" : ""}` : activityHref(lang, feed, page);
  return (
    <div className="flex flex-col">
      {reviews.map((r) => (
        <ReviewCard
          key={r.id}
          review={r}
          lang={lang}
          showItem
          viewer={viewer}
          back={here}
          t={dict.reviewCard}
          reportT={dict.report}
        />
      ))}
      {home ? (
        hasMore && (
          <Link
            href={activityHref(lang, feed, 2)}
            className="mt-3 self-center rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
          >
            {t.more}
          </Link>
        )
      ) : (
        (page > 1 || hasMore) && (
          <nav className="mt-4 flex items-center justify-between gap-4 text-sm font-medium">
            {page > 1 ? (
              <Link href={activityHref(lang, feed, page - 1)} className="hover:underline">
                ← {t.newer}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-zinc-500">{t.page.replace("{n}", String(page))}</span>
            {hasMore ? (
              <Link href={activityHref(lang, feed, page + 1)} className="hover:underline">
                {t.older} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )
      )}
    </div>
  );
}
