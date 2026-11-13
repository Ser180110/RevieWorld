"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { setLike } from "@/lib/social/actions";

type Props = {
  reviewId: string;
  initialLiked: boolean;
  initialCount: number;
  /** false: not signed in, the heart links to the login page. */
  signedIn: boolean;
  /** Own review: show the count only. */
  own: boolean;
  lang: string;
  labels: { like: string; unlike: string; likes: string };
};

type LikeState = { liked: boolean; count: number };

/**
 * The same review can be on screen twice (e.g. home: "from people you follow"
 * and "latest reviews"). Every button for a review shares its state through
 * this tiny event bus, so they never disagree.
 */
const listeners = new Map<string, Set<(s: LikeState) => void>>();
function publish(reviewId: string, state: LikeState) {
  listeners.get(reviewId)?.forEach((fn) => fn(state));
}

export function LikeButton({ reviewId, initialLiked, initialCount, signedIn, own, lang, labels }: Props) {
  const [state, setState] = useState<LikeState>({ liked: initialLiked, count: initialCount });
  const [busy, setBusy] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const set = listeners.get(reviewId) ?? new Set();
    set.add(setState);
    listeners.set(reviewId, set);
    return () => {
      set.delete(setState);
    };
  }, [reviewId]);

  const counter = state.count > 0 ? <span className="tabular-nums">{state.count}</span> : null;
  const base = "inline-flex items-center gap-1 text-sm";

  if (own) {
    return state.count > 0 ? (
      <span className={`${base} text-zinc-500`} title={labels.likes}>
        ♥ {counter}
      </span>
    ) : null;
  }
  if (!signedIn) {
    return (
      <Link href={`/${lang}/login`} className={`${base} text-zinc-500 hover:text-rose-500`} title={labels.like}>
        ♡ {counter}
      </Link>
    );
  }

  async function toggle() {
    if (busy) return;
    const previous = state;
    const next = !state.liked;
    const request = ++latest.current;
    setBusy(true);
    publish(reviewId, { liked: next, count: Math.max(0, state.count + (next ? 1 : -1)) });
    try {
      const result = await setLike(reviewId, next);
      // Only the newest answer counts; the server's numbers win over the guess.
      if (request === latest.current) {
        publish(reviewId, result.ok ? { liked: result.liked, count: result.count } : previous);
      }
    } catch {
      if (request === latest.current) publish(reviewId, previous);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={state.liked}
      title={state.liked ? labels.unlike : labels.like}
      className={`${base} cursor-pointer disabled:cursor-wait ${state.liked ? "text-rose-500" : "text-zinc-500 hover:text-rose-500"}`}
    >
      <span className="text-base leading-none">{state.liked ? "♥" : "♡"}</span>
      {counter}
    </button>
  );
}
