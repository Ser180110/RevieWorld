"use client";

import type { RefObject } from "react";

type Mark = "bold" | "italic" | "underline" | "spoiler" | "link";

const WRAP: Record<Exclude<Mark, "link">, [string, string]> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  underline: ["__", "__"],
  spoiler: [">!", "!<"],
};

/**
 * B / I / U / 🙈 spoiler / 🔗 link above the review text (like Reddit): it
 * wraps the selected words in the marks, or adds them at the cursor.
 */
export function FormatToolbar({
  target,
  t,
}: {
  target: RefObject<HTMLTextAreaElement | null>;
  t: {
    bold: string;
    italic: string;
    underline: string;
    spoiler: string;
    link: string;
    linkText: string;
    hint: string;
  };
}) {
  function apply(mark: Mark) {
    const el = target.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const picked = el.value.slice(start, end);
    let insert: string;
    let selStart: number;
    let selEnd: number;
    if (mark === "link") {
      const label = picked || t.linkText;
      const url = "https://";
      insert = `[${label}](${url})`;
      // Leave the cursor where the address goes.
      selStart = start + label.length + 3 + url.length;
      selEnd = selStart;
    } else {
      const [open, close] = WRAP[mark];
      const inner = picked || "";
      insert = open + inner + close;
      selStart = start + open.length;
      selEnd = selStart + inner.length;
    }
    const next = el.value.slice(0, start) + insert + el.value.slice(end);
    if (el.maxLength > 0 && next.length > el.maxLength) return;
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
    el.setSelectionRange(selStart, selEnd);
  }

  const btn =
    "flex h-9 min-w-9 items-center justify-center rounded-lg border border-zinc-300 px-2 text-sm hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100";
  return (
    <div className="flex flex-col gap-1">
      <div role="toolbar" className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => apply("bold")}
          title={t.bold}
          aria-label={t.bold}
          className={`${btn} font-bold`}
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => apply("italic")}
          title={t.italic}
          aria-label={t.italic}
          className={`${btn} font-serif italic`}
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => apply("underline")}
          title={t.underline}
          aria-label={t.underline}
          className={`${btn} underline underline-offset-2`}
        >
          U
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => apply("spoiler")}
          title={t.spoiler}
          className={`${btn} gap-1`}
        >
          🙈 <span className="text-xs">{t.spoiler}</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => apply("link")}
          title={t.link}
          className={`${btn} gap-1`}
        >
          🔗 <span className="text-xs">{t.link}</span>
        </button>
      </div>
      <span className="text-xs text-zinc-500">{t.hint}</span>
    </div>
  );
}
