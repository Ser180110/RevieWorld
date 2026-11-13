/** Grey placeholders shown while a list of reviews loads. */
export function ReviewSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex animate-pulse flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a whole page while its data loads. */
export function PageSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12" aria-busy>
      <div className="h-8 w-1/2 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <ReviewSkeletons />
    </div>
  );
}
