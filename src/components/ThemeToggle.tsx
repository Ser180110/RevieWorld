"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "auto";
const KEY = "rw-theme";
const ICON: Record<Theme, string> = { light: "☀️", dark: "🌙", auto: "🌓" };
const NEXT: Record<Theme, Theme> = { auto: "light", light: "dark", dark: "auto" };

/** Runs before the page is painted (in <head>), so there is no flash. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const listeners = new Set<() => void>();
function read(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "auto";
}
function write(t: Theme) {
  if (t === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  try {
    if (t === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Light / dark / automatic (follows the phone). `full` shows the three choices. */
export function ThemeToggle({
  t,
  full = false,
}: {
  t: { theme: string; themeLight: string; themeDark: string; themeAuto: string };
  full?: boolean;
}) {
  const theme = useSyncExternalStore(subscribe, read, () => "auto" as Theme);
  const names: Record<Theme, string> = { light: t.themeLight, dark: t.themeDark, auto: t.themeAuto };

  if (full) {
    return (
      <div role="radiogroup" aria-label={t.theme} className="flex gap-1 rounded-full bg-zinc-100 p-1 text-sm dark:bg-zinc-800">
        {(["light", "dark", "auto"] as Theme[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={theme === k}
            onClick={() => write(k)}
            className={`flex-1 cursor-pointer rounded-full px-2 py-1.5 ${
              theme === k ? "bg-white font-medium shadow-sm dark:bg-zinc-950" : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {ICON[k]} {names[k]}
          </button>
        ))}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => write(NEXT[theme])}
      title={`${t.theme}: ${names[theme]}`}
      aria-label={`${t.theme}: ${names[theme]}`}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      {ICON[theme]}
    </button>
  );
}
