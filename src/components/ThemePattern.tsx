/** Emoji scattered behind a profile card (decorative). */
export function ThemePattern({ emoji }: { emoji: string | null }) {
  if (!emoji) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-20">
      <div className="grid w-[140%] -translate-x-[10%] -translate-y-2 grid-cols-8 gap-x-6 gap-y-4 text-3xl sm:grid-cols-12">
        {Array.from({ length: 72 }, (_, i) => (
          <span key={i} className={i % 2 ? "rotate-12" : "-rotate-12 translate-x-4"}>
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
