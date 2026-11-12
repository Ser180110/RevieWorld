import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getCurrentUserId,
  getListPreviews,
  getProfile,
  getProfileStats,
  getUserLists,
  isFollowingUser,
} from "@/lib/data/queries";
import { ListCard } from "@/components/ListCard";
import { ProfileHeader } from "@/components/ProfileHeader";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/u/[username]/lists">): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)} · lists` };
}

async function ListsContent({
  lang,
  username,
}: {
  lang: Locale;
  username: string;
}) {
  const dict = await getDictionary(lang);
  const t = dict.lists;
  const profile = await getProfile(username);
  if (!profile) notFound();
  const [stats, lists, viewerId] = await Promise.all([
    getProfileStats(profile.id),
    getUserLists(profile.id),
    getCurrentUserId(),
  ]);
  const [following, previews] = await Promise.all([
    isFollowingUser(viewerId, profile.id),
    getListPreviews(lists.map((l) => l.id)),
  ]);
  const own = viewerId === profile.id;

  return (
    <div className="flex flex-col gap-8">
      <ProfileHeader
        profile={profile}
        stats={stats}
        viewerId={viewerId}
        following={following}
        active="lists"
        lang={lang}
        t={dict.profile}
      />
      {own && (
        <Link
          href={`/${lang}/lists/new`}
          className="self-start rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t.newList}
        </Link>
      )}
      {lists.length === 0 ? (
        <p className="text-zinc-500">{own ? t.emptyOwn : t.empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lists.map((l) => (
            <ListCard
              key={l.id}
              list={l}
              preview={previews[l.id] ?? []}
              lang={lang}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function UserListsPage({
  params,
}: PageProps<"/[lang]/u/[username]/lists">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {params.then(({ lang, username }) => {
          if (!hasLocale(lang)) notFound();
          return (
            <ListsContent lang={lang} username={decodeURIComponent(username)} />
          );
        })}
      </Suspense>
    </div>
  );
}
