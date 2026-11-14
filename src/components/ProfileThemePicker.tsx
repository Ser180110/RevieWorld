"use client";

import { useState } from "react";
import { PROFILE_EMOJI, PROFILE_THEMES, type ProfileThemeKey, canUseEmoji, isThemeKey, patternEmoji } from "@/lib/profileTheme";
import { Avatar } from "./Avatar";
import { ThemePattern } from "./ThemePattern";

const KEYS = Object.keys(PROFILE_THEMES) as ProfileThemeKey[];

/** Pick the profile background (solid or gradient) and an emoji pattern, with a live preview. */
export function ProfileThemePicker({
  initialBg,
  initialEmoji,
  name,
  username,
  avatarUrl,
  badge,
  t,
}: {
  initialBg: string | null | undefined;
  initialEmoji: string | null | undefined;
  name: string;
  username: string;
  avatarUrl: string | null;
  /** Founders also get the exclusive emoji (🍓). */
  badge?: string | null;
  t: { title: string; hint: string; solid: string; gradient: string; pattern: string; none: string };
}) {
  const [bg, setBg] = useState<ProfileThemeKey>(isThemeKey(initialBg) ? initialBg : "default");
  const [emoji, setEmoji] = useState<string | null>(patternEmoji(initialEmoji));
  const theme = PROFILE_THEMES[bg];

  const swatch = (k: ProfileThemeKey) => (
    <button
      key={k}
      type="button"
      aria-label={k}
      title={k}
      aria-pressed={bg === k}
      onClick={() => setBg(k)}
      className={`h-10 w-10 cursor-pointer rounded-full shadow-sm transition hover:scale-110 ${PROFILE_THEMES[k].bg} ${
        bg === k ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-zinc-950" : ""
      }`}
    />
  );

  return (
    <section className="flex flex-col gap-4">
      <input type="hidden" name="theme_bg" value={bg} />
      <input type="hidden" name="theme_emoji" value={emoji ?? ""} />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{t.title}</span>
        <span className="text-xs text-zinc-500">{t.hint}</span>
      </div>

      {/* Live preview */}
      <div className={`relative flex items-center gap-4 overflow-hidden rounded-3xl p-5 shadow-sm ${theme.bg}`}>
        <ThemePattern emoji={emoji} />
        <div className="relative">
          <Avatar url={avatarUrl} name={username} size={56} />
        </div>
        <div className="relative flex flex-col">
          <span className="text-xl font-semibold">{name}</span>
          <span className={`text-sm ${theme.muted}`}>@{username}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.solid}</span>
        <div className="flex flex-wrap gap-3">{KEYS.filter((k) => PROFILE_THEMES[k].kind === "solid").map(swatch)}</div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.gradient}</span>
        <div className="flex flex-wrap gap-3">{KEYS.filter((k) => PROFILE_THEMES[k].kind === "gradient").map(swatch)}</div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.pattern}</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={emoji === null}
            onClick={() => setEmoji(null)}
            className={`h-10 cursor-pointer rounded-xl px-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              emoji === null ? "bg-zinc-200 font-medium dark:bg-zinc-700" : ""
            }`}
          >
            {t.none}
          </button>
          {PROFILE_EMOJI.filter((e) => canUseEmoji(e, badge)).map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={emoji === e}
              onClick={() => setEmoji(e)}
              className={`h-10 w-10 cursor-pointer rounded-xl text-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                emoji === e ? "bg-zinc-200 dark:bg-zinc-700" : ""
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
