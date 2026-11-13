import Link from "next/link";
import { connection } from "next/server";
import { getUnreadCount, getCurrentUserId } from "@/lib/data/queries";

/** 🔔 with the number of unread notifications; nothing when signed out. */
export async function NotificationBell({ lang, label }: { lang: string; label: string }) {
  await connection();
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const unread = await getUnreadCount();
  return (
    <Link
      href={`/${lang}/notifications`}
      aria-label={unread ? `${label} (${unread})` : label}
      title={label}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      🔔
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-zinc-950">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
