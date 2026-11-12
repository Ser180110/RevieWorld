import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId, getProfile, getProfileStats, getWatchlist, isFollowingUser } from "@/lib/data/queries";
import { setWatchlist } from "@/lib/social/actions";
import { fill } from "@/lib/format";
import { ItemTile } from "@/components/ItemTile";
import { ProfileHeader } from "@/components/ProfileHeader";

export async function generateMetadata({ params }: PageProps<"/[lang]/u/[username]/watchlist">): Promise<Metadata> {
  const { lang, username } = await params;
  const name = `@${decodeURIComponent(username)}`;
  if (!hasLocale(lang)) return { title: name };
  return { title: `${name} · ${(await getDictionary(lang)).watchlist.title}` };
}

async function WatchlistContent({ lang, username }: { lang: Locale; username: string }) {
  const dict = await getDictionary(lang);
  const t = dict.watchlist;
  const profile = await getProfile(username);
  if (!profile) notFound();
  const [stats, items, viewerId] = await Promise.all([
    getProfileStats(profile.id),
    getWatchlist(profile.id),
    getCurrentUserId(),
  ]);
  const following = await isFollowingUser(viewerId, profile.id);
  const own = viewerId === profile.id;
  const back = `/${lang}/u/${profile.username}/watchlist`;

  return (
    <div className="flex flex-col gap-8">
      <ProfileHeader
        profile={profile}
        stats={stats}
        viewerId={viewerId}
        following={following}
        active="watchlist"
        lang={lang}
        t={dict.profile}
      />
      {items.length === 0 ? (
        <p className="text-zinc-500">{own ? t.emptyOwn : t.empty}</p>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            {items.length === 1 ? t.countOne : fill(t.count, { n: String(items.length) })}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ItemTile key={item.id} item={item} lang={lang}>
                {own && (
                  <span className="flex items-center gap-3">
                    {item.category && (
                      <Link
                        href={`/${lang}/c/${item.category.slug}/${item.slug}`}
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        {t.review}
                      </Link>
                    )}
                    <form action={setWatchlist}>
                      <input type="hidden" name="lang" value={lang} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="back" value={back} />
                      <input type="hidden" name="on" value="0" />
                      <button type="submit" title={t.remove} aria-label={t.remove} className="cursor-pointer hover:text-red-600">
                        ✕
                      </button>
                    </form>
                  </span>
                )}
              </ItemTile>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default async function WatchlistPage({ params }: PageProps<"/[lang]/u/[username]/watchlist">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {params.then(({ lang, username }) => {
          if (!hasLocale(lang)) notFound();
          return <WatchlistContent lang={lang} username={decodeURIComponent(username)} />;
        })}
      </Suspense>
    </div>
  );
}
