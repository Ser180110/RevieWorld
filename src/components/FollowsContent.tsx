import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getFollowList,
  getFollowedIds,
  getProfile,
  getProfileStats,
  getCurrentUserId,
  isFollowingUser,
} from "@/lib/data/queries";
import { fill } from "@/lib/format";
import { PersonRow } from "./PersonRow";
import { ProfileHeader } from "./ProfileHeader";

/** Followers or following of a user, under their profile header. */
export async function FollowsContent({
  lang,
  username,
  kind,
}: {
  lang: Locale;
  username: string;
  kind: "followers" | "following";
}) {
  const dict = await getDictionary(lang);
  const t = dict.profile;
  const profile = await getProfile(username);
  if (!profile) notFound();
  const [stats, people, viewerId] = await Promise.all([
    getProfileStats(profile.id),
    getFollowList(profile.id, kind),
    getCurrentUserId(),
  ]);
  const [following, followed] = await Promise.all([
    isFollowingUser(viewerId, profile.id),
    getFollowedIds(
      viewerId,
      people.map((p) => p.id),
    ),
  ]);
  const name = profile.display_name || `@${profile.username}`;

  return (
    <div className="flex flex-col gap-8">
      <ProfileHeader
        profile={profile}
        stats={stats}
        viewerId={viewerId}
        following={following}
        active="follows"
        lang={lang}
        t={t}
      />
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">
          {fill(kind === "followers" ? t.followersTitle : t.followingTitle, {
            name,
          })}
        </h2>
        {people.length === 0 ? (
          <p className="text-zinc-500">
            {kind === "followers" ? t.followersEmpty : t.followingEmpty}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {people.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                lang={lang}
                viewerId={viewerId}
                following={followed.includes(p.id)}
                back={`/${lang}/u/${profile.username}/${kind}`}
                t={t}
                youLabel={dict.people.you}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
