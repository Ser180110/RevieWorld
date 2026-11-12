import Link from "next/link";
import type { Dictionary } from "@/i18n/dictionaries";
import { addToList } from "@/lib/lists/actions";

/** Item page: pick one of my lists to add this item to, or start a new list with it. */
export function AddToList({
  lang,
  itemId,
  back,
  lists,
  t,
}: {
  lang: string;
  itemId: string;
  back: string;
  lists: { id: string; title: string; has: boolean }[];
  t: Dictionary["lists"];
}) {
  const available = lists.filter((l) => !l.has);
  const holding = lists.filter((l) => l.has);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {t.addToList}
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        {available.length > 0 && (
          <form action={addToList} className="flex items-center gap-2">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="itemId" value={itemId} />
            <input type="hidden" name="back" value={back} />
            <select
              name="listId"
              required
              defaultValue=""
              aria-label={t.choose}
              className="h-9 rounded-full border border-zinc-300 bg-transparent px-3 text-sm dark:border-zinc-700"
            >
              <option value="" disabled>
                {t.choose}
              </option>
              {available.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 cursor-pointer rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {t.add}
            </button>
          </form>
        )}
        <Link
          href={`/${lang}/lists/new?item=${itemId}&back=${encodeURIComponent(back)}`}
          className="text-sm font-medium hover:underline"
        >
          + {t.newWithItem}
        </Link>
      </div>
      {holding.length > 0 && (
        <p className="text-sm text-zinc-500">
          {t.alreadyIn}{" "}
          {holding.map((l, i) => (
            <span key={l.id}>
              {i > 0 && ", "}
              <Link href={`/${lang}/l/${l.id}`} className="underline">
                {l.title}
              </Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
