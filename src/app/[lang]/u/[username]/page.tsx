import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getProfile, getProfileStats, getUserReviews, getViewer, isFollowingUser } from "@/lib/data/queries";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ReviewCard } from "@/components/ReviewCard";

export async function generateMetadata({ params }: PageProps<"/[lang]/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)}` };
}

async function ProfileContent({ lang, username }: { lang: Locale; username: string }) {
  const dict = await getDictionary(lang);
  const profile = await getProfile(username);
  if (!profile) notFound();

  const [stats, reviews] = await Promise.all([getProfileStats(profile.id), getUserReviews(profile.id, 10)]);
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
                spoilerLabel={dict.reviewForm.spoiler}
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
