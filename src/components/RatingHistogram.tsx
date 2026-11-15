import Link from "next/link";

/** "★★★½" for a rating 1…10. */
export function starsText(r: number): string {
  return r === 1 ? "½★" : "★".repeat(Math.floor(r / 2)) + (r % 2 ? "½" : "");
}

/** ?rating=N as a number 1…10, or null. */
export function ratingFilterOf(value: string | string[] | undefined): number | null {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
}

/**
 * Letterboxd-style bars: how many gave ½ ★ … ★★★★★ (ratings 1…10).
 * Server component, plain HTML: a bar per half star, tallest = most votes.
 * With `hrefFor`, each bar links to the reviews with that rating.
 */
export function RatingHistogram({
  counts,
  title,
  votesLabel,
  hrefs,
  active = null,
  hint,
}: {
  counts: number[];
  title: string;
  /** "{n} voti" */
  votesLabel: string;
  /** One link per rating 1…10. */
  hrefs?: string[];
  /** The rating being shown, highlighted. */
  active?: number | null;
  /** Shown under the bars when they are links. */
  hint?: string;
}) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const max = Math.max(...counts);
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
        <div className="flex h-20 flex-1 items-end gap-[3px]" role={hrefs ? undefined : "img"} aria-label={`${title}: ${total}`}>
          {counts.map((n, i) => {
            const on = active === i + 1;
            const bar = (
              <div
                className={`relative w-full rounded-t transition group-hover:bg-amber-400 ${
                  on ? "bg-amber-400" : active ? "bg-zinc-200 dark:bg-zinc-800" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
                style={{ height: `${n === 0 ? 3 : Math.max(8, (n / max) * 100)}%` }}
              >
                <span
                  className={`pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-zinc-600 group-hover:block dark:text-zinc-300 ${
                    on ? "block" : "hidden"
                  }`}
                >
                  {n}
                </span>
              </div>
            );
            const label = `${starsText(i + 1)} · ${n}`;
            return hrefs ? (
              <Link
                key={i}
                href={hrefs[i]}
                scroll={false}
                title={label}
                aria-label={label}
                aria-current={on ? "true" : undefined}
                className="group flex h-full flex-1 cursor-pointer items-end"
              >
                {bar}
              </Link>
            ) : (
              <div key={i} title={label} className="group flex h-full flex-1 items-end">
                {bar}
              </div>
            );
          })}
        </div>
        <span className="pb-0.5 text-xs tracking-tighter text-amber-500" aria-hidden>
          ★★★★★
        </span>
      </div>
      {hrefs && hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </figure>
  );
}
