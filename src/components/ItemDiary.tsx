import type { Dictionary } from "@/i18n/dictionaries";
import type { DiaryEntry } from "@/lib/data/types";
import { fill } from "@/lib/format";
import { deleteDiaryEntry } from "@/lib/reviews/actions";
import { ConfirmButton } from "./ConfirmButton";
import { Stars } from "./Stars";

/** "📅 Il tuo diario qui": every time you logged this item. */
export function ItemDiary({
  lang,
  entries,
  back,
  t,
  confirmRemove,
}: {
  lang: string;
  entries: DiaryEntry[];
  back: string;
  t: Dictionary["quickLog"];
  confirmRemove: string;
}) {
  if (entries.length === 0) return null;
  const date = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold">
        {t.yourDiary}
        {entries.length > 1 && (
          <span className="ml-2 text-sm font-normal text-zinc-500">
            · {fill(t.times, { n: String(entries.length) })}
          </span>
        )}
      </h3>
      <ol className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {entries.map((e, i) => {
          const day = date.format(new Date(`${e.experienced_on}T00:00:00Z`));
          return (
            <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-6 text-center" aria-hidden>
                {i === 0 ? "✅" : "🔁"}
              </span>
              <span className="flex-1">{fill(i === 0 ? t.tried : t.again, { day })}</span>
              <Stars rating={e.rating} />
              {e.review_id === null ? (
                <form action={deleteDiaryEntry}>
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="entryId" value={e.id} />
                  <input type="hidden" name="back" value={back} />
                  <ConfirmButton
                    label="✕"
                    okLabel={t.remove}
                    confirmText={confirmRemove}
                    className="rounded-full px-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  />
                </form>
              ) : (
                <span className="w-6" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
