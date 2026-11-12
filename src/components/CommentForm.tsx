"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { addComment } from "@/lib/social/actions";

export function CommentForm({ lang, reviewId, t }: { lang: string; reviewId: string; t: Dictionary["comments"] }) {
  const [state, formAction, pending] = useActionState(addComment, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok]);
  return (
    <form ref={form} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="reviewId" value={reviewId} />
      <textarea
        name="body"
        required
        maxLength={1000}
        rows={3}
        placeholder={t.placeholder}
        className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {t.errors[state.error]}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-end cursor-pointer rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? t.sending : t.submit}
      </button>
    </form>
  );
}
