"use client";

import { useActionState, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { addComment } from "@/lib/social/actions";
import { MentionSuggest } from "./MentionSuggest";
import { StickerPicker } from "./StickerPicker";
import { QuickEmoji } from "./QuickEmoji";
import type { Attachment } from "@/lib/stickers";

export function CommentForm({ lang, reviewId, t }: { lang: string; reviewId: string; t: Dictionary["comments"] }) {
  const [state, formAction, pending] = useActionState(addComment, {});
  const [body, setBody] = useState("");
  const [sticker, setSticker] = useState<Attachment | null>(null);
  const [lastOk, setLastOk] = useState(state.ok);
  const area = useRef<HTMLTextAreaElement>(null);

  // Clear the box after a comment is sent.
  if (state.ok !== lastOk) {
    setLastOk(state.ok);
    setBody("");
    setSticker(null);
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="reviewId" value={reviewId} />
      <div className="relative">
        <textarea
          ref={area}
          name="body"
          required={!sticker}
          maxLength={960}
          rows={3}
          value={body}
          placeholder={t.placeholder}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
        />
        <MentionSuggest target={area} />
      </div>
      <QuickEmoji target={area} label="Emoji" />
      <StickerPicker lang={lang} value={sticker} onChange={setSticker} t={{ add: t.stickerAdd, remove: t.stickerRemove }} />
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
