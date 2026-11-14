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

/**
 * What a review or comment can carry: one of our badge stickers, or a GIPHY
 * GIF / sticker (animated, transparent background) saved by its id.
 */
export type Attachment =
  | { kind: "sticker"; key: StickerKey }
  | { kind: "gif" | "gsticker"; id: string };

const GIPHY_ID = /^[A-Za-z0-9]{5,40}$/;

/** "fire", "gif:abc123" or "gsticker:abc123" → attachment (null if invalid). */
export function parseAttachment(value: unknown): Attachment | null {
  if (typeof value !== "string" || !value) return null;
  const [kind, id] = value.split(":", 2);
  if (id === undefined) return isStickerKey(kind) ? { kind: "sticker", key: kind } : null;
  if (kind === "sticker") return isStickerKey(id) ? { kind: "sticker", key: id } : null;
  if ((kind === "gif" || kind === "gsticker") && GIPHY_ID.test(id)) return { kind, id };
  return null;
}

/** The value sent by the form for an attachment. */
export function attachmentValue(a: Attachment | null): string {
  if (!a) return "";
  return a.kind === "sticker" ? a.key : `${a.kind}:${a.id}`;
}

/** Animated image of a GIPHY item (webp keeps stickers transparent). */
export function giphyUrl(id: string, small = false): string {
  return `https://media.giphy.com/media/${id}/${small ? "200w" : "giphy"}.webp`;
}

const TOKEN = /\s*\{\{(sticker|gif|gsticker):([A-Za-z0-9]+)\}\}\s*/g;

/** Text without attachment tokens, and the (first valid) attachment. */
export function splitSticker(body: string | null | undefined): { text: string; sticker: Attachment | null } {
  if (!body) return { text: "", sticker: null };
  let sticker: Attachment | null = null;
  const text = body
    .replace(TOKEN, (_, kind: string, id: string) => {
      sticker ??= parseAttachment(`${kind}:${id}`);
      return "\n";
    })
    .trim();
  return { text, sticker };
}

/** Short text for previews (notifications): the text, or an icon. */
export function previewText(body: string | null | undefined): string {
  const { text, sticker } = splitSticker(body);
  if (text) return text;
  if (!sticker) return "";
  return sticker.kind === "sticker" ? STICKERS[sticker.key].emoji : sticker.kind === "gif" ? "GIF" : "✨";
}

/** Body to save: the text plus the attachment token (if any). */
export function joinSticker(text: string, value: string | null | undefined): string {
  const clean = splitSticker(text).text;
  const a = parseAttachment(value);
  if (!a) return clean;
  const token = a.kind === "sticker" ? `{{sticker:${a.key}}}` : `{{${a.kind}:${a.id}}}`;
  return `${clean}${clean ? "\n" : ""}${token}`;
}
