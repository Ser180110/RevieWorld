import Link from "next/link";
import { connection } from "next/server";
import { getUnreadCount, getCurrentUserId } from "@/lib/data/queries";
import { LiveBellCount } from "./LiveBellCount";

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
      <LiveBellCount initial={unread} />
    </Link>
  );
}
