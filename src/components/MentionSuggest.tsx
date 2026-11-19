"use client";

import { useEffect, useState, type RefObject } from "react";
import { suggestMentions, type MentionSuggestion } from "@/lib/social/actions";
import { Avatar } from "./Avatar";

type Mention = { start: number; query: string };

/** The "@abc" (or just "@") being typed right before the cursor, if any. */
export function mentionAt(text: string, cursor: number): Mention | null {
  const m = /(^|\s)@([A-Za-z0-9_]{0,30})$/.exec(text.slice(0, cursor));
  return m ? { start: cursor - m[2].length - 1, query: m[2] } : null;
}

/** Writes into a textarea so React (controlled or not) sees the change. */
function setValue(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * WhatsApp-style "@" suggestions under a textarea: type @ and the people you
 * follow show up, keep typing to search by username or name, tap to insert.
 * Render it inside a `relative` wrapper right after the textarea.
 */
export function MentionSuggest({ target }: { target: RefObject<HTMLTextAreaElement | null> }) {
  const [mention, setMention] = useState<Mention | null>(null);
  const [people, setPeople] = useState<MentionSuggestion[]>([]);
  const [active, setActive] = useState(0);
  const open = mention !== null && people.length > 0;

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const check = () => {
      const m = mentionAt(el.value, el.selectionStart);
      setMention((old) => (old?.start === m?.start && old?.query === m?.query ? old : m));
    };
    const close = () => setTimeout(() => setMention(null), 150);
    el.addEventListener("input", check);
    el.addEventListener("click", check);
    el.addEventListener("blur", close);
    return () => {
      el.removeEventListener("input", check);
      el.removeEventListener("click", check);
      el.removeEventListener("blur", close);
    };
  }, [target]);

  useEffect(() => {
    if (!mention) return;
    let live = true;
    const timer = setTimeout(() => {
      suggestMentions(mention.query).then(
        (list) => {
          if (!live) return;
          setPeople(list);
          setActive(0);
        },
        () => {},
      );
    }, 150);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [mention]);

  function pick(username: string) {
    const el = target.current;
    if (!el || !mention) return;
    const end = mention.start + 1 + mention.query.length;
    setValue(el, `${el.value.slice(0, mention.start)}@${username} ${el.value.slice(end)}`);
    setMention(null);
    const pos = mention.start + username.length + 2;
    el.focus();
    el.setSelectionRange(pos, pos);
  }

  // Keyboard: arrows to move, Enter/Tab to pick, Esc to close.
  useEffect(() => {
    const el = target.current;
    if (!el || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((i) => (i + step + people.length) % people.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(people[active]?.username ?? people[0].username);
      } else if (e.key === "Escape") {
        setMention(null);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  });

  if (!open) return null;
  return (
    <ul
      role="listbox"
      className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
    >
      {people.map((p, i) => (
        <li key={p.username} role="option" aria-selected={i === active}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(p.username)}
            className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${i === active ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
          >
            <Avatar url={p.avatar_url} name={p.username} size={28} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{p.display_name || p.username}</span>
              <span className="truncate text-xs text-zinc-500">@{p.username}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
