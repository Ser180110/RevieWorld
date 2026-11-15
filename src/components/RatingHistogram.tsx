/**
 * Letterboxd-style bars: how many gave ½ ★ … ★★★★★ (ratings 1…10).
 * Server component, plain HTML: a bar per half star, tallest = most votes.
 */
export function RatingHistogram({
  counts,
  title,
  votesLabel,
}: {
  counts: number[];
  title: string;
  /** "{n} voti" */
  votesLabel: string;
}) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const max = Math.max(...counts);
  const stars = (r: number) => "★".repeat(Math.floor(r / 2)) + (r % 2 ? "½" : "");
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{title}</span>
        <span className="text-zinc-500">{votesLabel.replace("{n}", String(total))}</span>
      </figcaption>
      <div className="flex items-end gap-2">
        <span className="pb-0.5 text-xs text-amber-500" aria-hidden>
          ★
        </span>
        <div className="flex h-20 flex-1 items-end gap-[3px]" role="img" aria-label={`${title}: ${total}`}>
          {counts.map((n, i) => (
            <div
              key={i}
              title={`${stars(i + 1)} · ${n}`}
              className="group relative flex-1 rounded-t bg-zinc-300 transition hover:bg-amber-400 dark:bg-zinc-700 dark:hover:bg-amber-400"
              style={{ height: `${n === 0 ? 3 : Math.max(8, (n / max) * 100)}%` }}
            >
              <span className="pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-zinc-600 group-hover:block dark:text-zinc-300">
                {n}
              </span>
            </div>
          ))}
        </div>
        <span className="pb-0.5 text-xs tracking-tighter text-amber-500" aria-hidden>
          ★★★★★
        </span>
      </div>
    </figure>
  );
}
