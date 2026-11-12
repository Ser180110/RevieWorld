import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { signOut } from "@/lib/auth/actions";

const link = "rounded-full px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800";

/** Signed-in user's name and a sign-out button, or sign-in / sign-up links. */
export async function UserMenu({ lang, t }: { lang: Locale; t: Dictionary["nav"] }) {
  let username: string | null = null;

  if (supabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      username = data?.username ?? user.email ?? "";
    }
  }

  if (username === null) {
    return (
      <div className="flex items-center gap-1">
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
    <form action={signOut} className="flex items-center gap-2">
      <input type="hidden" name="lang" value={lang} />
      <span className="text-sm font-medium">@{username}</span>
      <button type="submit" className={link}>
        {t.signOut}
      </button>
    </form>
  );
}
