"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { COMMENT_REACTIONS, type CommentReaction, type ReactionSummary } from "@/lib/reactions";
import { reactToComment } from "@/lib/social/actions";
import { EMOJI_GROUPS } from "./QuickEmoji";

/**
 * WhatsApp/Instagram-style reactions under a comment: the chips with the
 * counts, and a ☺ button that opens 👍 ❤️ 😂 😮 😢 🔥. Tapping your own
 * reaction again removes it.
 */
export function CommentReactions({
  commentId,
  initial,
  signedIn,
  lang,
  t,
}: {
  commentId: string;
  initial: ReactionSummary;
  signedIn: boolean;
  lang: string;
  t: { react: string; remove: string; signIn: string; more: string };
}) {
  const [state, setState] = useState<ReactionSummary>(initial);
  const [open, setOpen] = useState(false);
  // "+": every emoji, by group (like WhatsApp).
  const [all, setAll] = useState(false);
  const [group, setGroup] = useState(0);
  const [, startTransition] = useTransition();

  function pick(emoji: CommentReaction) {
    const before = state;
    const mine = state.mine === emoji ? null : emoji;
    const counts = { ...state.counts };
    if (state.mine) counts[state.mine] = Math.max(0, (counts[state.mine] ?? 1) - 1);
    if (mine) counts[mine] = (counts[mine] ?? 0) + 1;
    for (const k of Object.keys(counts)) if (!counts[k]) delete counts[k];
    setState({ counts, mine });
    setOpen(false);
    setAll(false);
    startTransition(async () => {
      const res = await reactToComment(commentId, mine);
      if (!res.ok) setState(before);
    });
  }

  // Most used first.
  const shown = Object.keys(state.counts)
    .filter((e) => state.counts[e] > 0)
    .sort((a, b) => state.counts[b] - state.counts[a]);
  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {shown.map((e) => (
        <button
          key={e}
          type="button"
          disabled={!signedIn}
          onClick={() => pick(e)}
          title={state.mine === e ? t.remove : t.react}
          className={`flex h-7 items-center gap-1 rounded-full border px-2 text-sm tabular-nums transition ${
            state.mine === e
              ? "border-sky-400 bg-sky-50 text-sky-800 dark:border-sky-600 dark:bg-sky-950/50 dark:text-sky-200"
              : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          }`}
        >
          <span>{e}</span>
          <span className="text-xs">{state.counts[e]}</span>
        </button>
      ))}
      {signedIn ? (
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            setAll(false);
          }}
          aria-expanded={open}
          aria-label={t.react}
          title={t.react}
          className="flex h-7 items-center rounded-full border border-dashed border-zinc-300 px-2 text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-800 dark:border-zinc-700 dark:hover:text-zinc-200"
        >
          ☺<span className="text-xs">+</span>
        </button>
      ) : null}
      {!signedIn && shown.length > 0 && (
        <Link href={`/${lang}/login`} className="text-xs text-zinc-500 hover:underline">
          {t.signIn}
        </Link>
      )}
      {open && (
        <div
          role="menu"
          className="absolute bottom-9 left-0 z-20 flex max-w-[calc(100vw-5rem)] flex-col gap-2 rounded-3xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="flex items-center gap-1">
            {COMMENT_REACTIONS.map((e) => (
              <button
                key={e}
                type="button"
                role="menuitem"
                onClick={() => pick(e)}
                aria-label={e}
                className={`rounded-full p-1 text-2xl leading-none transition hover:scale-125 ${
                  state.mine === e ? "bg-sky-100 dark:bg-sky-900" : ""
                }`}
              >
                {e}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAll((a) => !a)}
              aria-expanded={all}
              aria-label={t.more}
              title={t.more}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-xl text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {all ? "−" : "+"}
            </button>
          </div>
          {all && (
            <div className="flex w-72 max-w-full flex-col gap-2 px-1 pb-1">
              <div className="flex gap-1 border-b border-zinc-200 pb-1 dark:border-zinc-700">
                {EMOJI_GROUPS.map((g, i) => (
                  <button
                    key={g.icon}
                    type="button"
                    onClick={() => setGroup(i)}
                    className={`rounded-lg px-1.5 py-0.5 text-lg ${group === i ? "bg-zinc-200 dark:bg-zinc-700" : ""}`}
                  >
                    {g.icon}
                  </button>
                ))}
              </div>
              <div className="grid max-h-48 grid-cols-7 gap-0.5 overflow-y-auto">
                {EMOJI_GROUPS[group].list.split(" ").map((e) => (
                  <button
                    key={e}
                    type="button"
                    role="menuitem"
                    onClick={() => pick(e)}
                    aria-label={e}
                    className={`rounded-lg p-1 text-2xl leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      state.mine === e ? "bg-sky-100 dark:bg-sky-900" : ""
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
