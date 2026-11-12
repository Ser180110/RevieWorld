import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Profile, ProfileStats } from "@/lib/data/types";
import { fill } from "@/lib/format";
import { setUserFollow } from "@/lib/social/actions";
import { Avatar } from "./Avatar";

const pill =
  "rounded-full px-4 py-1.5 text-sm font-medium border border-zinc-300 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100";

/** Avatar, name, bio, counters, follow / edit button and the Profile · Diary tabs. */
export function ProfileHeader({
  profile,
  stats,
  viewerId,
  following,
  active,
  lang,
  t,
}: {
  profile: Profile;
  stats: ProfileStats;
  viewerId: string | null;
  following: boolean;
  active: "profile" | "diary";
  lang: Locale;
  t: Dictionary["profile"];
}) {
  const base = `/${lang}/u/${profile.username}`;
  const own = viewerId === profile.id;
  const joined = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(
    new Date(profile.created_at),
  );
  const website = profile.website?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const tab = (key: typeof active, href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`border-b-2 px-1 pb-2 text-sm font-medium ${
        active === key
          ? "border-zinc-900 dark:border-zinc-100"
          : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar url={profile.avatar_url} name={profile.username} size={88} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {profile.display_name || profile.username}
            </h1>
            {own ? (
              <Link href={`/${lang}/settings`} className={pill}>
                {t.edit}
              </Link>
            ) : (
              <form action={setUserFollow}>
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="userId" value={profile.id} />
                <input type="hidden" name="username" value={profile.username} />
                <input type="hidden" name="follow" value={following ? "0" : "1"} />
                <button
                  type="submit"
                  title={following ? t.unfollow : undefined}
                  className={
                    following
                      ? `${pill} cursor-pointer`
                      : "cursor-pointer rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                  }
                >
                  {following ? t.following : t.follow}
                </button>
              </form>
            )}
          </div>
          <p className="text-zinc-500">@{profile.username}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
            {profile.location && <span>📍 {profile.location}</span>}
            {profile.website && website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">
                🔗 {website}
              </a>
            )}
            <span>{fill(t.joined, { date: joined })}</span>
          </p>
        </div>
        <dl className="flex gap-6 text-center">
          {[
            [stats.reviews, t.reviews],
            [stats.followers, t.followers],
            [stats.following, t.followingCount],
          ].map(([n, label]) => (
            <div key={label} className="flex flex-col">
              <dt className="order-2 text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
              <dd className="order-1 text-2xl font-semibold tabular-nums">{n}</dd>
            </div>
          ))}
        </dl>
      </div>
      {profile.bio && <p className="max-w-2xl whitespace-pre-line text-zinc-700 dark:text-zinc-300">{profile.bio}</p>}
      <nav className="flex gap-6 border-b border-zinc-200 dark:border-zinc-800">
        {tab("profile", base, t.reviewsTab)}
        {tab("diary", `${base}/diary`, t.diaryTab)}
      </nav>
    </header>
  );
}
