"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getLikeStates, setLike } from "@/lib/social/actions";

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

// ---------------------------------------------------------------------------
// Shared store: every heart for the same review shows the same state, and the
// state is re-read from the server when the page appears (the browser or the
// router can show an old copy of the page, e.g. after "back").
// ---------------------------------------------------------------------------
const listeners = new Map<string, Set<(s: LikeState) => void>>();
const busy = new Set<string>();
let queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function publish(reviewId: string, state: LikeState) {
  listeners.get(reviewId)?.forEach((fn) => fn(state));
}

function refresh(reviewId: string) {
  queue.add(reviewId);
  if (timer) return;
  timer = setTimeout(async () => {
    const ids = [...queue];
    queue = new Set();
    timer = null;
    try {
      const states = await getLikeStates(ids);
      for (const [id, state] of Object.entries(states)) {
        if (!busy.has(id)) publish(id, state);
      }
    } catch {
      // Offline or server error: keep what is on screen.
    }
  }, 30);
}

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) listeners.forEach((_, id) => refresh(id));
  });
}

export function LikeButton({ reviewId, initialLiked, initialCount, signedIn, own, lang, labels }: Props) {
  const [state, setState] = useState<LikeState>({ liked: initialLiked, count: initialCount });
  const [pending, setPending] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const set = listeners.get(reviewId) ?? new Set();
    set.add(setState);
    listeners.set(reviewId, set);
    refresh(reviewId);
    return () => {
      set.delete(setState);
    };
  }, [reviewId]);

  const base = "inline-flex items-center gap-1 text-sm";
  const counter =
    state.count > 0 ? (
      <Link
        href={`/${lang}/r/${reviewId}#likes`}
        title={labels.likes}
        className="tabular-nums text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
      >
        {state.count}
      </Link>
    ) : null;

  if (own || !signedIn) {
    if (own && state.count === 0) return null;
    return (
      <span className={`${base} text-zinc-500`}>
        {own ? (
          <span aria-hidden>♥</span>
        ) : (
          <Link href={`/${lang}/login`} title={labels.like} className="hover:text-rose-500">
            ♡
          </Link>
        )}
        {counter}
      </span>
    );
  }

  async function toggle() {
    if (busy.has(reviewId)) return;
    const previous = state;
    const next = !state.liked;
    const request = ++latest.current;
    busy.add(reviewId);
    setPending(true);
    publish(reviewId, { liked: next, count: Math.max(0, state.count + (next ? 1 : -1)) });
    try {
      const result = await setLike(reviewId, next);
      // The server's answer (real state, real count) wins over the guess.
      if (request === latest.current) {
        publish(reviewId, result.ok ? { liked: result.liked, count: result.count } : previous);
      }
    } catch {
      if (request === latest.current) publish(reviewId, previous);
    } finally {
      busy.delete(reviewId);
      setPending(false);
    }
  }

  return (
    <span className={base}>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={state.liked}
        title={state.liked ? labels.unlike : labels.like}
        className={`cursor-pointer text-base leading-none transition active:scale-125 disabled:cursor-wait ${
          state.liked ? "text-rose-500" : "text-zinc-500 hover:text-rose-500"
        }`}
      >
        {state.liked ? "♥" : "♡"}
      </button>
      {counter}
    </span>
  );
}
