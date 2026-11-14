import { STICKERS, type StickerKey } from "@/lib/stickers";

/** A sticker: tilted, white-bordered badge with a big emoji. */
export function Sticker({ k, lang, size = "md" }: { k: StickerKey; lang: string; size?: "sm" | "md" }) {
  const s = STICKERS[k];
  const label = lang === "en" ? s.en : s.it;
  return (
    <span
      className={`inline-flex -rotate-3 select-none items-center gap-1.5 rounded-2xl border-[3px] border-white font-extrabold shadow-md ring-1 ring-black/5 dark:border-zinc-100 ${s.bg} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-base"
      }`}
    >
      <span className={size === "sm" ? "text-lg leading-none" : "text-3xl leading-none"} aria-hidden>
        {s.emoji}
      </span>
      {label}
    </span>
  );
}
