"use client";

import { useState } from "react";
import { STICKERS, type StickerKey } from "@/lib/stickers";
import { Sticker } from "./Sticker";

/** Choose (or remove) one sticker; sends it as the hidden field `sticker`. */
export function StickerPicker({
  lang,
  value,
  onChange,
  t,
}: {
  lang: string;
  value: StickerKey | null;
  onChange: (key: StickerKey | null) => void;
  t: { add: string; remove: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="sticker" value={value ?? ""} />
      <div className="flex flex-wrap items-center gap-3">
        {value && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="cursor-pointer">
            <Sticker k={value} lang={lang} size="sm" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-zinc-300 px-3 py-1 text-sm hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
        >
          🏷️ {t.add}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="cursor-pointer text-sm text-zinc-500 hover:underline">
            {t.remove}
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          {(Object.keys(STICKERS) as StickerKey[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={k === value}
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              className={`cursor-pointer rounded-2xl p-0.5 transition hover:scale-110 ${k === value ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""}`}
            >
              <Sticker k={k} lang={lang} size="sm" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
