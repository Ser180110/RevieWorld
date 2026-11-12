"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setLike } from "@/lib/social/actions";

type Props = {
  reviewId: string;
  initialLiked: boolean;
  initialCount: number;
  /** null: not signed in, the heart links to the login page. */
  signedIn: boolean;
  /** Own review: show the count only. */
  own: boolean;
  lang: string;
  labels: { like: string; unlike: string; likes: string };
};

export function LikeButton({ reviewId, initialLiked, initialCount, signedIn, own, lang, labels }: Props) {
  const [state, setState] = useState({ liked: initialLiked, count: initialCount });
  const [pending, start] = useTransition();
  const heart = state.liked ? "♥" : "♡";
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

  function toggle() {
    const next = !state.liked;
    const previous = state;
    setState({ liked: next, count: state.count + (next ? 1 : -1) });
    start(async () => {
      const result = await setLike(reviewId, next);
      setState(result.ok ? { liked: result.liked, count: result.count } : previous);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={state.liked}
      title={state.liked ? labels.unlike : labels.like}
      className={`${base} cursor-pointer ${state.liked ? "text-rose-500" : "text-zinc-500 hover:text-rose-500"}`}
    >
      <span className="text-base leading-none">{heart}</span>
      {counter}
    </button>
  );
}
