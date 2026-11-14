"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { addComment, suggestMentions, type MentionSuggestion } from "@/lib/social/actions";
import { Avatar } from "./Avatar";
import { StickerPicker } from "./StickerPicker";
import { QuickEmoji } from "./QuickEmoji";
import type { Attachment } from "@/lib/stickers";

/** The "@abc" being typed just before the cursor, if any. */
function mentionAt(text: string, cursor: number): { start: number; query: string } | null {
  const m = /(^|\s)@([A-Za-z0-9_]{1,30})$/.exec(text.slice(0, cursor));
  return m ? { start: cursor - m[2].length - 1, query: m[2] } : null;
}

export function CommentForm({ lang, reviewId, t }: { lang: string; reviewId: string; t: Dictionary["comments"] }) {
  const [state, formAction, pending] = useActionState(addComment, {});
  const [body, setBody] = useState("");
  const [sticker, setSticker] = useState<Attachment | null>(null);
  const [lastOk, setLastOk] = useState(state.ok);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [people, setPeople] = useState<MentionSuggestion[]>([]);
  const area = useRef<HTMLTextAreaElement>(null);

  // Clear the box after a comment is sent.
  if (state.ok !== lastOk) {
    setLastOk(state.ok);
    setBody("");
    setSticker(null);
    setMention(null);
  }

  useEffect(() => {
    if (!mention) return;
    let live = true;
    const timer = setTimeout(() => {
      suggestMentions(mention.query).then(
        (list) => live && setPeople(list),
        () => {},
      );
    }, 150);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [mention]);

  function pick(username: string) {
    if (!mention) return;
    const cursor = mention.start + 1 + mention.query.length;
    const next = `${body.slice(0, mention.start)}@${username} ${body.slice(cursor)}`;
    setBody(next);
    setMention(null);
    setPeople([]);
    const pos = mention.start + username.length + 2;
    requestAnimationFrame(() => {
      area.current?.focus();
      area.current?.setSelectionRange(pos, pos);
    });
  }

  const open = mention !== null && people.length > 0;

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
          onChange={(e) => {
            setBody(e.target.value);
            const m = mentionAt(e.target.value, e.target.selectionStart);
            setMention(m);
            if (!m) setPeople([]);
          }}
          onKeyDown={(e) => {
            if (open && (e.key === "Enter" || e.key === "Tab")) {
              e.preventDefault();
              pick(people[0].username);
            } else if (e.key === "Escape") {
              setMention(null);
            }
          }}
          onBlur={() => setTimeout(() => setMention(null), 150)}
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100"
        />
        {open && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            {people.map((p) => (
              <li key={p.username} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p.username)}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Avatar url={p.avatar_url} name={p.username} size={24} />
                  <span className="font-medium">@{p.username}</span>
                  {p.display_name && <span className="truncate text-zinc-500">{p.display_name}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
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
