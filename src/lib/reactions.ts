/** The quick reactions shown first (any other emoji can be picked with "+"). */
export const COMMENT_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;
export type CommentReaction = string;

const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

/** True for exactly one emoji (also 👨‍👩‍👧, 🇮🇹, ❤️‍🔥): nothing else is a reaction. */
export function isReaction(v: unknown): v is CommentReaction {
  if (typeof v !== "string" || v.length === 0 || v.length > 16) return false;
  if (/[A-Za-z0-9\s<>&"]/.test(v)) return false;
  const parts = [...new Intl.Segmenter("it", { granularity: "grapheme" }).segment(v)];
  return parts.length === 1 && EMOJI.test(v);
}

/** Reactions on one comment: how many of each, and the viewer's own. */
export type ReactionSummary = { counts: Record<string, number>; mine: CommentReaction | null };
