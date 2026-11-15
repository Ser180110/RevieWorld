"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setListLike } from "@/lib/lists/actions";

/** ❤️ on a list, with the count. Owners only see the count. */
export function ListLikeButton({
  listId,
  initialLiked,
  initialCount,
  signedIn,
  own,
  lang,
  labels,
}: {
  listId: string;
  initialLiked: boolean;
  initialCount: number;
  signedIn: boolean;
  own: boolean;
  lang: string;
  labels: { like: string; unlike: string; likes: string };
}) {
  const [state, setState] = useState({ liked: initialLiked, count: initialCount });
  const [pending, start] = useTransition();
  const heart = state.liked ? "❤️" : "🤍";
  const cls =
    "inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";

  if (own) {
    return (
      <span className={cls} title={labels.likes}>
        ❤️ {state.count}
      </span>
    );
  }
  if (!signedIn) {
    return (
      <Link href={`/${lang}/login`} className={`${cls} hover:bg-zinc-100 dark:hover:bg-zinc-800`} title={labels.like}>
        🤍 {state.count}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={state.liked}
      title={state.liked ? labels.unlike : labels.like}
      onClick={() => {
        const next = { liked: !state.liked, count: state.count + (state.liked ? -1 : 1) };
        const before = state;
        setState(next);
        start(async () => {
          const saved = await setListLike(listId, next.liked);
          setState(saved ?? before);
        });
      }}
      className={`${cls} cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800`}
    >
      {heart} {state.count}
    </button>
  );
}
