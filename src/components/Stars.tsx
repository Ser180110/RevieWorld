/** Read-only stars for a 1-10 rating (shown as 0.5-5 stars). */
export function Stars({ rating, size = "text-base" }: { rating: number; size?: string }) {
  const stars = rating / 2;
  return (
    <span className={`inline-flex ${size} leading-none`} aria-label={`${stars} / 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = stars >= i ? 100 : stars >= i - 0.5 ? 50 : 0;
        return (
          <span key={i} className="relative inline-block text-zinc-300 dark:text-zinc-700" aria-hidden>
            ★
            <span
              className="absolute inset-0 overflow-hidden text-amber-500"
              style={{ width: `${fill}%` }}
            >
              ★
            </span>
          </span>
        );
      })}
    </span>
  );
}
