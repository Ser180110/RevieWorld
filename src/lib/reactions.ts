/** The reactions you can put on a comment (same list as the database check). */
export const COMMENT_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;
export type CommentReaction = (typeof COMMENT_REACTIONS)[number];

export function isReaction(v: unknown): v is CommentReaction {
  return (COMMENT_REACTIONS as readonly unknown[]).includes(v);
}

/** Reactions on one comment: how many of each, and the viewer's own. */
export type ReactionSummary = { counts: Partial<Record<CommentReaction, number>>; mine: CommentReaction | null };
