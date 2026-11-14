import { STICKERS, giphyUrl, type Attachment } from "@/lib/stickers";

/**
 * An attachment: one of our tilted badge stickers, or a GIPHY GIF / sticker
 * (animated, stickers with a transparent background).
 */
export function Sticker({ a, lang, size = "md" }: { a: Attachment; lang: string; size?: "sm" | "md" }) {
  if (a.kind !== "sticker") {
    const gif = a.kind === "gif";
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={giphyUrl(a.id, size === "sm")}
        alt={gif ? "GIF" : "Sticker"}
        loading="lazy"
        decoding="async"
        className={
          gif
            ? `w-auto max-w-full rounded-xl ${size === "sm" ? "max-h-40" : "max-h-64"}`
            : `w-auto max-w-full drop-shadow-md ${size === "sm" ? "max-h-28" : "max-h-40"}`
        }
      />
    );
  }
  const s = STICKERS[a.key];
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
