import Link from "next/link";
import { connection } from "next/server";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getCurrentProfile } from "@/lib/data/queries";
import { supabaseEnv } from "@/lib/supabase/env";
import { signOut } from "@/lib/auth/actions";
import { Avatar } from "./Avatar";

const link =
  "rounded-full px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800";

/** Signed-in user's name and a sign-out button, or sign-in / sign-up links. */
export async function UserMenu({
  lang,
  t,
  column = false,
}: {
  lang: Locale;
  t: Dictionary["nav"];
  /** Stacked layout for the mobile menu. */
  column?: boolean;
}) {
  // Session data is per request: never prerender this part.
  await connection();
  const me = supabaseEnv() ? await getCurrentProfile() : null;
  const username = me ? me.username : null;
  const avatarUrl = me?.avatar_url ?? null;

  if (username === null) {
    return (
      <div className={column ? "flex flex-col items-start gap-2" : "flex items-center gap-1"}>
        <Link href={`/${lang}/login`} className={link}>
          {t.signIn}
        </Link>
        <Link
          href={`/${lang}/signup`}
          className="rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t.signUp}
        </Link>
      </div>
    );
  }

  return (
    <form action={signOut} className={column ? "flex flex-col items-start gap-1" : "flex items-center gap-2"}>
      <input type="hidden" name="lang" value={lang} />
      {username && (
        <>
          <Link href={`/${lang}/u/${username}/diary`} className={link}>
            {t.diary}
          </Link>
          <Link href={`/${lang}/u/${username}/lists`} className={link}>
            {t.lists}
          </Link>
          <Link
            href={`/${lang}/u/${username}`}
            title={t.profile}
            className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Avatar url={avatarUrl} name={username} size={26} />@{username}
          </Link>
        </>
      )}
      <button type="submit" className={link}>
        {t.signOut}
      </button>
    </form>
  );
}
