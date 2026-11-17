"use client";

import { useState } from "react";
import { EMOJI_CHOICES } from "@/lib/categoryStyle";

/** The first emoji in what was typed or pasted, or null (letters and numbers don't count). */
function firstEmoji(text: string): string | null {
  const parts =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map((p) => p.segment)
      : [...text];
  return parts.find((g) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g) && g.length <= 16) ?? null;
}

/**
 * Pick the category emoji: a grid of common ones, or type/paste any emoji.
 * Sends it as a hidden `icon` field.
 */
export function EmojiPicker({
  value,
  onChange,
  label,
  otherLabel,
  onlyEmojiLabel,
}: {
  value: string;
  onChange: (emoji: string) => void;
  label: string;
  otherLabel: string;
  /** Shown when letters are typed instead of an emoji. */
  onlyEmojiLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [notEmoji, setNotEmoji] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="icon" value={value} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          title={label}
          className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-zinc-300 bg-white text-3xl hover:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-100"
        >
          {value}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="cursor-pointer text-sm font-medium hover:underline">
          {label}
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={e === value}
                onClick={() => {
                  onChange(e);
                  setOpen(false);
                }}
                className={`flex aspect-square cursor-pointer items-center justify-center rounded-lg text-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  e === value ? "bg-zinc-200 dark:bg-zinc-700" : ""
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-500">
            {otherLabel}
            <input
              value={typed}
              placeholder="🙂"
              onChange={(e) => {
                const text = e.target.value;
                const emoji = firstEmoji(text);
                setNotEmoji(text.trim() !== "" && !emoji);
                setTyped(emoji ?? "");
                if (emoji) onChange(emoji);
              }}
              className="h-9 w-16 rounded-lg border border-zinc-300 bg-transparent text-center text-xl dark:border-zinc-700"
            />
          </label>
          {notEmoji && <p className="text-xs text-amber-700 dark:text-amber-400">{onlyEmojiLabel}</p>}
        </div>
      )}
    </div>
  );
}
