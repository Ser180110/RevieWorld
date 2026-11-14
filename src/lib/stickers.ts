/**
 * Stickers for reviews and comments: a fixed set, saved inside the text as
 * "{{sticker:key}}" so no database change is needed.
 */

export const STICKERS = {
  fire: { emoji: "🔥", it: "Top!", en: "Fire!", bg: "bg-orange-400 text-white" },
  love: { emoji: "😍", it: "Amore", en: "Love it", bg: "bg-rose-400 text-white" },
  goat: { emoji: "🐐", it: "GOAT", en: "GOAT", bg: "bg-amber-300 text-zinc-900" },
  hundred: { emoji: "💯", it: "100%", en: "100%", bg: "bg-white text-red-600" },
  king: { emoji: "👑", it: "Il re", en: "The king", bg: "bg-yellow-300 text-zinc-900" },
  wow: { emoji: "🤯", it: "Wow", en: "Mind blown", bg: "bg-violet-500 text-white" },
  lol: { emoji: "😂", it: "Ahah", en: "LOL", bg: "bg-yellow-200 text-zinc-900" },
  yum: { emoji: "😋", it: "Gnam", en: "Yummy", bg: "bg-lime-300 text-zinc-900" },
  clap: { emoji: "👏", it: "Bravo", en: "Bravo", bg: "bg-sky-400 text-white" },
  must: { emoji: "⭐", it: "Da provare", en: "Must try", bg: "bg-emerald-400 text-white" },
  meh: { emoji: "😐", it: "Mah…", en: "Meh", bg: "bg-zinc-300 text-zinc-900" },
  sleep: { emoji: "😴", it: "Noia", en: "Boring", bg: "bg-indigo-300 text-zinc-900" },
  yuck: { emoji: "🤢", it: "Bleah", en: "Yuck", bg: "bg-green-600 text-white" },
  clown: { emoji: "🤡", it: "Ridicolo", en: "Clownery", bg: "bg-red-400 text-white" },
  poop: { emoji: "💩", it: "Pessimo", en: "Awful", bg: "bg-amber-800 text-white" },
  avoid: { emoji: "🚫", it: "Evitare", en: "Avoid", bg: "bg-red-600 text-white" },
  money: { emoji: "💸", it: "Caro!", en: "Pricey!", bg: "bg-emerald-600 text-white" },
  deal: { emoji: "🤑", it: "Affare", en: "Bargain", bg: "bg-teal-400 text-zinc-900" },
  cozy: { emoji: "🥰", it: "Che pace", en: "Cozy", bg: "bg-pink-300 text-zinc-900" },
  party: { emoji: "🥳", it: "Festa!", en: "Party!", bg: "bg-fuchsia-500 text-white" },
} as const;

export type StickerKey = keyof typeof STICKERS;

export function isStickerKey(value: unknown): value is StickerKey {
  return typeof value === "string" && Object.hasOwn(STICKERS, value);
}

const TOKEN = /\s*\{\{sticker:([a-z]+)\}\}\s*/g;

/** Text without sticker tokens, and the (first valid) sticker. */
export function splitSticker(body: string | null | undefined): { text: string; sticker: StickerKey | null } {
  if (!body) return { text: "", sticker: null };
  let sticker: StickerKey | null = null;
  const text = body
    .replace(TOKEN, (_, key: string) => {
      if (!sticker && isStickerKey(key)) sticker = key;
      return "\n";
    })
    .trim();
  return { text, sticker };
}

/** Body to save: the text plus the sticker token (if any). */
export function joinSticker(text: string, sticker: string | null | undefined): string {
  const clean = splitSticker(text).text;
  return isStickerKey(sticker) ? `${clean}${clean ? "\n" : ""}{{sticker:${sticker}}}` : clean;
}
