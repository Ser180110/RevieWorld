import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Profile, ProfileStats } from "@/lib/data/types";
import { fill } from "@/lib/format";
import { AvatarZoom } from "./AvatarZoom";
import { FollowButton } from "./FollowButton";
import { ThemePattern } from "./ThemePattern";
import { patternEmoji, themeOf } from "@/lib/profileTheme";

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
  active: "profile" | "diary" | "lists" | "watchlist" | "follows";
  lang: Locale;
  t: Dictionary["profile"];
}) {
  const base = `/${lang}/u/${profile.username}`;
  const theme = themeOf(profile.theme_bg);
  const muted = theme.muted;
  const own = viewerId === profile.id;
  const joined = new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
  }).format(new Date(profile.created_at));
  const website = profile.website
    ?.replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
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
      <div className={`relative flex flex-col gap-4 overflow-hidden rounded-3xl p-5 shadow-sm sm:p-7 ${theme.bg}`}>
      <ThemePattern emoji={patternEmoji(profile.theme_emoji)} />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <AvatarZoom url={profile.avatar_url} name={profile.username} size={88} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {profile.display_name || profile.username}
            </h1>
            {own ? (
              <Link
                href={`/${lang}/settings`}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur ${
                  theme.dark ? "border-white/40 bg-white/10 hover:bg-white/20" : "border-zinc-900/20 bg-white/50 hover:bg-white/80 dark:border-zinc-700"
                }`}
              >
                {t.edit}
              </Link>
            ) : (
              <FollowButton
                lang={lang}
                userId={profile.id}
                username={profile.username}
                following={following}
                signedIn={viewerId !== null}
                t={t}
              />
            )}
          </div>
          <p className={`flex flex-wrap items-center gap-2 ${muted}`}>
            @{profile.username}
            {profile.badge === "founder" && (
              <span
                title={t.founderTitle}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-200 to-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300 dark:from-amber-900 dark:to-yellow-900 dark:text-amber-100 dark:ring-amber-700"
              >
                👑 {t.founder}
              </span>
            )}
            {profile.badge === "ideator" && (
              <span
                title={t.ideatorTitle}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-200 to-violet-200 px-2.5 py-0.5 text-xs font-semibold text-violet-900 ring-1 ring-violet-300 dark:from-sky-900 dark:to-violet-900 dark:text-violet-100 dark:ring-violet-700"
              >
                💡 {t.ideator}
              </span>
            )}
          </p>
          <p className={`flex flex-wrap gap-x-4 gap-y-1 text-sm ${muted}`}>
            {profile.location && <span>📍 {profile.location}</span>}
            {profile.website && website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:underline"
              >
                🔗 {website}
              </a>
            )}
            <span>{fill(t.joined, { date: joined })}</span>
          </p>
        </div>
        <dl className="flex gap-6 text-center">
          {(
            [
              [stats.reviews, t.reviews, `${base}/diary`],
              [stats.followers, t.followers, `${base}/followers`],
              [stats.following, t.followingCount, `${base}/following`],
            ] as const
          ).map(([n, label, href]) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col rounded-lg px-1 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <dt className={`order-2 text-xs uppercase tracking-wide ${muted}`}>
                {label}
              </dt>
              <dd className="order-1 text-2xl font-semibold tabular-nums">
                {n}
              </dd>
            </Link>
          ))}
        </dl>
      </div>
      {profile.bio && <p className="relative max-w-2xl whitespace-pre-line">{profile.bio}</p>}
      </div>
      <nav className="flex gap-6 border-b border-zinc-200 dark:border-zinc-800">
        {tab("profile", base, t.reviewsTab)}
        {tab("diary", `${base}/diary`, t.diaryTab)}
        {tab("lists", `${base}/lists`, t.listsTab)}
        {tab("watchlist", `${base}/watchlist`, t.watchlistTab)}
      </nav>
    </header>
  );
}
