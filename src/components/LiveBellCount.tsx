"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchUnreadCount } from "@/lib/social/actions";

type BadgeNavigator = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * The red number on the 🔔: checked again every 30 seconds and whenever the
 * app comes back on screen, and copied onto the app icon (installed app).
 * On the notifications page it disappears at once (they are being read),
 * and it is checked again right after leaving it.
 */
export function LiveBellCount({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  const [seen, setSeen] = useState(initial);
  const pathname = usePathname();
  const reading = /\/notifications\/?$/.test(pathname);
  const [wasReading, setWasReading] = useState(reading);
  if (initial !== seen) {
    setSeen(initial);
    setCount(initial);
  }
  if (reading !== wasReading) {
    setWasReading(reading);
    if (reading) setCount(0);
  }

  useEffect(() => {
    let live = true;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetchUnreadCount().then(
        (n) => live && setCount(n),
        () => {},
      );
    };
    check();
    const timer = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [reading]);

  const shown = reading ? 0 : count;

  useEffect(() => {
    const nav = navigator as BadgeNavigator;
    (shown > 0 ? nav.setAppBadge?.(shown) : nav.clearAppBadge?.())?.catch(() => {});
  }, [shown]);

  if (shown <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-zinc-950">
      {shown > 99 ? "99+" : shown}
    </span>
  );
}
