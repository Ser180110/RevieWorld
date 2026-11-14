/**
 * Profile look: a background from a fixed set (no uploads) plus an optional
 * emoji pattern. Only keys are stored; unknown keys fall back to "default".
 */

export type ProfileTheme = {
  /** Background + text classes (literal strings so Tailwind keeps them). */
  bg: string;
  /** Secondary text, borders and hover on this background. */
  muted: string;
  dark: boolean;
  kind: "solid" | "gradient";
};

export const PROFILE_THEMES = {
  default: { bg: "bg-white text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800", muted: "text-zinc-500", dark: false, kind: "solid" },
  sand: { bg: "bg-amber-50 text-zinc-900", muted: "text-zinc-600", dark: false, kind: "solid" },
  lemon: { bg: "bg-yellow-100 text-zinc-900", muted: "text-zinc-600", dark: false, kind: "solid" },
  mint: { bg: "bg-emerald-100 text-zinc-900", muted: "text-zinc-600", dark: false, kind: "solid" },
  sky: { bg: "bg-sky-100 text-zinc-900", muted: "text-zinc-600", dark: false, kind: "solid" },
  lavender: { bg: "bg-violet-100 text-zinc-900", muted: "text-zinc-600", dark: false, kind: "solid" },
  rose: { bg: "bg-rose-100 text-zinc-900", muted: "text-zinc-600", dark: false, kind: "solid" },
  night: { bg: "bg-zinc-900 text-white", muted: "text-zinc-300", dark: true, kind: "solid" },
  navy: { bg: "bg-indigo-950 text-white", muted: "text-indigo-200", dark: true, kind: "solid" },
  forest: { bg: "bg-emerald-900 text-white", muted: "text-emerald-200", dark: true, kind: "solid" },
  wine: { bg: "bg-rose-900 text-white", muted: "text-rose-200", dark: true, kind: "solid" },
  sunset: { bg: "bg-gradient-to-br from-orange-300 via-rose-300 to-fuchsia-400 text-zinc-900", muted: "text-zinc-700", dark: false, kind: "gradient" },
  peach: { bg: "bg-gradient-to-br from-amber-200 to-rose-300 text-zinc-900", muted: "text-zinc-700", dark: false, kind: "gradient" },
  candy: { bg: "bg-gradient-to-br from-pink-300 to-violet-300 text-zinc-900", muted: "text-zinc-700", dark: false, kind: "gradient" },
  ocean: { bg: "bg-gradient-to-br from-cyan-200 to-blue-400 text-zinc-900", muted: "text-zinc-700", dark: false, kind: "gradient" },
  aurora: { bg: "bg-gradient-to-br from-emerald-300 via-teal-300 to-violet-400 text-zinc-900", muted: "text-zinc-700", dark: false, kind: "gradient" },
  lime: { bg: "bg-gradient-to-br from-lime-200 to-emerald-400 text-zinc-900", muted: "text-zinc-700", dark: false, kind: "gradient" },
  fire: { bg: "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 text-white", muted: "text-orange-50", dark: true, kind: "gradient" },
  galaxy: { bg: "bg-gradient-to-br from-indigo-900 via-purple-800 to-fuchsia-700 text-white", muted: "text-purple-200", dark: true, kind: "gradient" },
  midnight: { bg: "bg-gradient-to-br from-zinc-900 via-slate-800 to-indigo-900 text-white", muted: "text-slate-300", dark: true, kind: "gradient" },
} satisfies Record<string, ProfileTheme>;

export type ProfileThemeKey = keyof typeof PROFILE_THEMES;

/** Emoji that can be scattered on the background (none = no pattern). */
export const PROFILE_EMOJI = [
  "⭐", "✨", "💖", "🔥", "🌈", "☀️", "🌙", "☁️", "🌸", "🌻",
  "🍀", "🌊", "🍕", "🍩", "🍓", "🍉", "☕", "🎧", "🎮", "📚",
  "🎬", "⚽", "🐶", "🐱", "🦄", "👑", "💎", "🎈", "🚀", "🌍",
];

export function isThemeKey(value: unknown): value is ProfileThemeKey {
  return typeof value === "string" && Object.hasOwn(PROFILE_THEMES, value);
}

export function themeOf(key: string | null | undefined): ProfileTheme {
  return isThemeKey(key) ? PROFILE_THEMES[key] : PROFILE_THEMES.default;
}

export function patternEmoji(value: string | null | undefined): string | null {
  return value && PROFILE_EMOJI.includes(value) ? value : null;
}

/** Only for the founders (profiles with a badge): Sergio and Corinne. */
export const EXCLUSIVE_EMOJI = ["🍓"];

export function canUseEmoji(emoji: string, badge: string | null | undefined): boolean {
  return !EXCLUSIVE_EMOJI.includes(emoji) || Boolean(badge);
}
