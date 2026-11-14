import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId, getNotifications } from "@/lib/data/queries";
import { fill, formatDate } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";
import { ReviewSkeletons } from "@/components/Skeletons";
import { splitSticker, STICKERS } from "@/lib/stickers";

export async function generateMetadata({ params }: PageProps<"/[lang]/notifications">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.notifications.title };
}

async function NotificationList({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);
  const t = dict.notifications;
  const userId = await getCurrentUserId();
  if (!userId) {
    return (
      <Link href={`/${lang}/login`} className="underline">
        {t.signIn}
      </Link>
    );
  }
  const list = await getNotifications();
  const unread = list.filter((n) => !n.read_at).length;
  if (list.length === 0) return <p className="text-zinc-500">{t.empty}</p>;

  return (
    <>
      <MarkNotificationsRead unread={unread} />
      <ul className="flex flex-col gap-2">
        {list.map((n) => {
          const username = n.actor?.username ?? "?";
          const name = n.actor?.display_name || `@${username}`;
          const what = n.review?.item?.name ?? "";
          const href =
            n.type === "follow"
              ? `/${lang}/u/${username}`
              : `/${lang}/r/${n.review_id}${n.type === "like" ? "#likes" : "#comments"}`;
          const text =
            n.type === "like"
              ? fill(t.like, { name, what })
              : n.type === "comment"
                ? fill(t.comment, { name, what })
                : n.type === "mention"
                  ? fill(t.mention, { name, what })
                  : fill(t.follow, { name });
          return (
            <li key={n.id}>
              <Link
                href={href}
                className={`flex items-start gap-3 rounded-2xl border p-3 transition hover:shadow-sm ${
                  n.read_at
                    ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40"
                }`}
              >
                <span className="relative shrink-0">
                  <Avatar url={n.actor?.avatar_url} name={username} size={40} />
                  <span className="absolute -bottom-1 -right-1 text-sm" aria-hidden>
                    {n.type === "like" ? "❤️" : n.type === "comment" ? "💬" : n.type === "mention" ? "📣" : "👤"}
                  </span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm">{text}</span>
                  {(n.type === "comment" || n.type === "mention") && n.comment?.body && (
                    <span className="line-clamp-2 text-sm text-zinc-500">
                      “{splitSticker(n.comment.body).text || (splitSticker(n.comment.body).sticker ? STICKERS[splitSticker(n.comment.body).sticker!].emoji : "")}”
                    </span>
                  )}
                  <time className="text-xs text-zinc-500" dateTime={n.created_at}>
                    {formatDate(n.created_at, lang)}
                  </time>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default async function NotificationsPage({ params }: PageProps<"/[lang]/notifications">) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <Suspense fallback={<ReviewSkeletons count={3} />}>
        {params.then(async ({ lang }) => {
          if (!hasLocale(lang)) notFound();
          const dict = await getDictionary(lang);
          return (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">🔔 {dict.notifications.title}</h1>
              <NotificationList lang={lang} />
            </>
          );
        })}
      </Suspense>
    </div>
  );
}
