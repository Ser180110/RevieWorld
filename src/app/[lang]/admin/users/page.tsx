import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getAdminUsers, getCurrentUserId, isAppFounder, type AdminUser } from "@/lib/data/queries";
import { formatDate } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/users">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { title: (await getDictionary(lang)).adminUsers.title, robots: { index: false } };
}

/** How many signed up in the last 7 days. */
function signedUpLastWeek(users: AdminUser[]): number {
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  return users.filter((u) => u.signed_up_at && new Date(u.signed_up_at).getTime() > weekAgo).length;
}

/** Sergio only: everyone who has an account, newest first. */
async function Users({ lang }: { lang: Locale }) {
  const t = (await getDictionary(lang)).adminUsers;
  const userId = await getCurrentUserId();
  if (!userId) redirect(`/${lang}/login`);
  if (!(await isAppFounder(userId))) notFound();
  const { users, full } = await getAdminUsers();
  const newThisWeek = signedUpLastWeek(users);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-3xl font-semibold tabular-nums">{users.length}</p>
          <p className="text-sm text-zinc-500">{t.total}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-3xl font-semibold tabular-nums">{newThisWeek}</p>
          <p className="text-sm text-zinc-500">{t.thisWeek}</p>
        </div>
      </div>
      {!full && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{t.needsUpdate}</p>}
      <ul className="flex flex-col divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-3 py-3">
            <Link href={`/${lang}/u/${u.username}`} className="shrink-0">
              <Avatar url={u.avatar_url} name={u.username} size={40} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={`/${lang}/u/${u.username}`} className="truncate font-semibold hover:underline">
                {u.display_name || `@${u.username}`}{" "}
                {u.display_name && <span className="font-normal text-zinc-500">@{u.username}</span>}
              </Link>
              {u.email && (
                <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                  {u.email}
                  {u.confirmed === false && <span className="ml-2 text-amber-600">⚠️ {t.notConfirmed}</span>}
                </span>
              )}
              <span className="text-xs text-zinc-500">
                {t.signedUp} {u.signed_up_at ? formatDate(u.signed_up_at, lang) : "—"}
                {u.last_sign_in_at && ` · ${t.lastSeen} ${formatDate(u.last_sign_in_at, lang)}`}
              </span>
            </div>
            {u.reviews !== null && (
              <span className="shrink-0 text-right text-sm tabular-nums text-zinc-500">
                <span className="block text-lg font-semibold text-zinc-900 dark:text-zinc-100">{u.reviews}</span>
                {t.reviews}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function AdminUsersPage({ params }: PageProps<"/[lang]/admin/users">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">👥 {dict.adminUsers.title}</h1>
      <Suspense fallback={<p className="text-zinc-500">{dict.common.loading}</p>}>
        <Users lang={lang} />
      </Suspense>
    </div>
  );
}
