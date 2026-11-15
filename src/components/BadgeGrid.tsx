import type { Dictionary } from "@/i18n/dictionaries";
import type { BadgeState } from "@/lib/data/queries";

/** Profile badges: unlocked in colour, the others grey with how much is missing. */
export function BadgeGrid({ badges, t }: { badges: BadgeState[]; t: Dictionary["badges"] }) {
  const unlocked = badges.filter((b) => b.done).length;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        🏅 {t.title} <span className="text-zinc-400">({unlocked}/{badges.length})</span>
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {badges.map((b) => (
          <li
            key={b.key}
            title={t[b.key].hint}
            className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center ${
              b.done
                ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                : "border-zinc-200 opacity-60 grayscale dark:border-zinc-800"
            }`}
          >
            <span className="text-3xl leading-none" aria-hidden>
              {b.emoji}
            </span>
            <span className="text-sm font-semibold leading-tight">{t[b.key].name}</span>
            <span className="text-xs text-zinc-500">{b.done ? t[b.key].hint : `${b.have}/${b.need}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
