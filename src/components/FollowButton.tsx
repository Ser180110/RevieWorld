import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import { setUserFollow } from "@/lib/social/actions";

const outline =
  "cursor-pointer rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100";
const solid =
  "cursor-pointer rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900";

/** Follow / unfollow another user. `back` is revalidated too (lists of people). */
export function FollowButton({
  lang,
  userId,
  username,
  following,
  signedIn,
  back,
  t,
}: {
  lang: string;
  userId: string;
  username: string;
  following: boolean;
  signedIn: boolean;
  back?: string;
  t: Pick<Dictionary["profile"], "follow" | "following" | "unfollow">;
}) {
  if (!signedIn) {
    return (
      <Link href={`/${lang}/login`} className={solid}>
        {t.follow}
      </Link>
    );
  }
  return (
    <form action={setUserFollow}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="username" value={username} />
      <input type="hidden" name="follow" value={following ? "0" : "1"} />
      {back && <input type="hidden" name="back" value={back} />}
      <button
        type="submit"
        title={following ? t.unfollow : undefined}
        className={following ? outline : solid}
      >
        {following ? t.following : t.follow}
      </button>
    </form>
  );
}
