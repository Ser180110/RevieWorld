"use client";

import { useEffect, useState } from "react";
import { fetchUnreadCount } from "@/lib/social/actions";

type BadgeNavigator = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * The red number on the 🔔: checked again every 30 seconds and whenever the
 * app comes back on screen, and copied onto the app icon (installed app).
 */
export function LiveBellCount({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setCount(initial);
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
    const timer = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  useEffect(() => {
    const nav = navigator as BadgeNavigator;
    (count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.())?.catch(() => {});
  }, [count]);

  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-zinc-950">
      {count > 99 ? "99+" : count}
    </span>
  );
}
