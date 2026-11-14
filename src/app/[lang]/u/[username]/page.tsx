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
  isFollowingUser, getFoundedCategories } from "@/lib/data/queries";
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

  const [stats, reviews, favorites, founded] = await Promise.all([
    getProfileStats(profile.id),
    getUserReviews(profile.id, 10),
    getFavorites(profile.id),
    getFoundedCategories(profile.id),
  ]);
  const viewer = await getViewer(reviews);
  const following = await isFollowingUser(viewer.id, profile.id);
  const base = `/${lang}/u/${profile.username}`;

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
      <div className="-mt-4">
        <ShareButton
          variant="pill"
          path={base}
          title={`@${profile.username}`}
          text={fill(dict.share.profile, { name: profile.display_name || `@${profile.username}` })}
          label={dict.share.button}
          copiedLabel={dict.share.copied}
        />
      </div>
      {founded.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            👑 {dict.profile.foundedTitle} <span className="text-zinc-400">({founded.length})</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {founded.map((c) => (
              <CategoryTile key={c.id} category={c} lang={lang} reviewsLabel={dict.common.reviews} />
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
        {reviews.length === 0 ? (
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
