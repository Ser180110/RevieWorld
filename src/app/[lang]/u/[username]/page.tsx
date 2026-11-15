import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getFavorites,
  getProfile,
  getProfileStats,
  getUserReviews,
  getViewer,
  isFollowingUser, getFoundedCategories,
  getBadges,
  getOpenReports,
  getRatingCounts,
  hasBlocked,
  isModerator,
} from "@/lib/data/queries";
import { BadgeGrid } from "@/components/BadgeGrid";
import { BlockButton } from "@/components/BlockButton";
import { RatingHistogram } from "@/components/RatingHistogram";
import { ReportButton } from "@/components/ReportButton";
import { setFavorite } from "@/lib/social/actions";
import { ItemTile } from "@/components/ItemTile";
import { CategoryTile } from "@/components/CategoryTile";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ReviewCard } from "@/components/ReviewCard";
import { ShareButton } from "@/components/ShareButton";
import { fill } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/[lang]/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)}` };
}

async function ProfileContent({ lang, username }: { lang: Locale; username: string }) {
  const dict = await getDictionary(lang);
  const profile = await getProfile(username);
  if (!profile) notFound();

  const [stats, reviews, favorites, founded, ratingCounts, blocked] = await Promise.all([
    getProfileStats(profile.id),
    getUserReviews(profile.id, 10),
    getFavorites(profile.id),
    getFoundedCategories(profile.id),
    getRatingCounts({ userId: profile.id }),
    hasBlocked(profile.id),
  ]);
  const viewer = await getViewer(reviews);
  const own = viewer.id === profile.id;
  const [following, badges, moderator] = await Promise.all([
    isFollowingUser(viewer.id, profile.id),
    getBadges(profile.id, stats.reviews, founded.length),
    own ? isModerator(viewer.id) : Promise.resolve(false),
  ]);
  const openReports = moderator ? (await getOpenReports()).length : 0;
  const base = `/${lang}/u/${profile.username}`;
  const m = dict.moderation;

  return (
    <div className="flex flex-col gap-8">
      <ProfileHeader
        profile={profile}
        stats={stats}
        viewerId={viewer.id}
        following={following}
        active="profile"
        lang={lang}
        t={dict.profile}
      />
      <div className="-mt-4 flex flex-wrap items-center gap-1">
        <ShareButton
          variant="pill"
          path={base}
          title={`@${profile.username}`}
          text={fill(dict.share.profile, { name: profile.display_name || `@${profile.username}` })}
          label={dict.share.button}
          copiedLabel={dict.share.copied}
        />
        {viewer.id && !own && (
          <>
            <ReportButton lang={lang} targetType="user" targetId={profile.id} t={dict.report} />
            <BlockButton userId={profile.id} blocked={blocked} path={base} t={m} />
          </>
        )}
      </div>
      {moderator && (
        <Link
          href={`/${lang}/reports`}
          className={`flex items-center justify-between rounded-2xl border p-4 font-medium ${
            openReports > 0
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              : "border-zinc-200 dark:border-zinc-800"
          }`}
        >
          <span>🚩 {m.reportsBox}</span>
          <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-sm text-white">{openReports}</span>
        </Link>
      )}
      {blocked && (
        <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">🚫 {m.blockedBanner}</p>
      )}
      <BadgeGrid badges={badges} t={dict.badges} />
      <RatingHistogram
        counts={ratingCounts}
        title={dict.ratings.title}
        votesLabel={dict.ratings.votes}
        hint={dict.ratings.hint}
        hrefs={ratingCounts.map((_, i) => `/${lang}/u/${profile.username}/diary?rating=${i + 1}`)}
      />
      {founded.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            👑 {dict.profile.foundedTitle} <span className="text-zinc-400">({founded.length})</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {founded.map((c) => (
              <CategoryTile key={c.id} category={c} lang={lang} reviewsLabel={dict.common.reviews} insideLabel={dict.profile.subcategoryOf} />
            ))}
          </div>
        </section>
      )}
      {(favorites.length > 0 || viewer.id === profile.id) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{dict.profile.favoritesTitle}</h2>
          {favorites.length === 0 ? (
            <p className="text-sm text-zinc-500">{dict.profile.favoritesEmptyOwn}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {favorites.map((item) => (
                <ItemTile key={item.id} item={item} lang={lang}>
                  {viewer.id === profile.id && (
                    <form action={setFavorite}>
                      <input type="hidden" name="lang" value={lang} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="back" value={base} />
                      <input type="hidden" name="on" value="0" />
                      <button
                        type="submit"
                        title={dict.profile.removeFavorite}
                        aria-label={dict.profile.removeFavorite}
                        className="cursor-pointer hover:text-red-600"
                      >
                        ✕
                      </button>
                    </form>
                  )}
                </ItemTile>
              ))}
            </div>
          )}
        </section>
      )}
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{dict.profile.recentTitle}</h2>
        {blocked ? null : reviews.length === 0 ? (
          <p className="text-zinc-500">{dict.profile.recentEmpty}</p>
        ) : (
          <>
            {reviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                lang={lang}
                showItem
                showAuthor={false}
                viewer={viewer}
                back={base}
                t={dict.reviewCard}
              reportT={dict.report}
              />
            ))}
            {stats.reviews > reviews.length && (
              <Link href={`${base}/diary`} className="text-sm font-medium hover:underline">
                {dict.profile.seeDiary}
              </Link>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default async function ProfilePage({ params }: PageProps<"/[lang]/u/[username]">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {params.then(({ lang, username }) => {
          if (!hasLocale(lang)) notFound();
          return <ProfileContent lang={lang} username={decodeURIComponent(username)} />;
        })}
      </Suspense>
    </div>
  );
}
