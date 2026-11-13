"use client";

import { useActionState, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { COLOR_CLASSES, COLORS, type CategoryColor } from "@/lib/categoryStyle";
import { setCategoryStyle } from "@/lib/reviews/actions";
import { EmojiPicker } from "./EmojiPicker";

/** Creator-only: change the category emoji and colour. */
export function CategoryStyleEditor({
  lang,
  categoryId,
  slug,
  emoji,
  color,
  t,
}: {
  lang: string;
  categoryId: string;
  slug: string;
  emoji: string;
  color: CategoryColor;
  t: Dictionary["category"];
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(color);
  const [icon, setIcon] = useState(emoji);
  const [state, formAction, pending] = useActionState(setCategoryStyle, {});

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer self-start rounded-full bg-white/60 px-3 py-1 text-xs font-medium hover:bg-white dark:bg-black/30 dark:hover:bg-black/50"
      >
        🎨 {t.editStyle}
      </button>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl bg-white/80 p-4 dark:bg-black/40">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="color" value={picked} />
      <EmojiPicker value={icon} onChange={setIcon} label={t.emojiLabel} otherLabel={t.emojiOther} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="w-16 font-medium">{t.colorLabel}</span>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={picked === c}
            onClick={() => setPicked(c)}
            className={`h-7 w-7 cursor-pointer rounded-full ${COLOR_CLASSES[c].swatch} ${
              picked === c ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100" : ""
            }`}
          />
        ))}
      </div>
      {state.error && <p className="text-sm text-red-600">{t.styleError}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {t.saveStyle}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-sm text-zinc-600 hover:underline">
          {t.cancelStyle}
        </button>
      </div>
    </form>
  );
}
