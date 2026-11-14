"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { markNotificationsRead } from "@/lib/social/actions";

/** Once the notifications page is on screen, mark them read and refresh the bell. */
export function MarkNotificationsRead({ unread }: { unread: number }) {
  const router = useRouter();
  useEffect(() => {
    // The number on the app icon (installed app) goes away too.
    (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
    if (unread === 0) return;
    markNotificationsRead().then(() => router.refresh(), () => {});
  }, [unread, router]);
  return null;
}
