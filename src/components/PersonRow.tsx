import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import type { ProfileCard } from "@/lib/data/types";
import { Avatar } from "./Avatar";
import { FollowButton } from "./FollowButton";

/** One user in a list of people, with a follow button. */
export function PersonRow({
  person,
  lang,
  viewerId,
  following,
  back,
  t,
  youLabel,
}: {
  person: ProfileCard;
  lang: string;
  viewerId: string | null;
  following: boolean;
  back: string;
  t: Dictionary["profile"];
  youLabel: string;
}) {
  const href = `/${lang}/u/${person.username}`;
  return (
    <li className="flex items-center gap-4 py-3">
      <Link href={href}>
        <Avatar url={person.avatar_url} name={person.username} size={48} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={href} className="truncate font-semibold hover:underline">
          {person.display_name || person.username}
        </Link>
        <span className="truncate text-sm text-zinc-500">
          @{person.username}
        </span>
        {person.bio && (
          <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
            {person.bio}
          </span>
        )}
      </div>
      {viewerId === person.id ? (
        <span className="text-sm text-zinc-500">{youLabel}</span>
      ) : (
        <FollowButton
          lang={lang}
          userId={person.id}
          username={person.username}
          following={following}
          signedIn={viewerId !== null}
          back={back}
          t={t}
        />
      )}
    </li>
  );
}
