import type { Dictionary } from "@/i18n/dictionaries";
import { setFavorite, setWatchlist } from "@/lib/social/actions";

const outline =
  "cursor-pointer rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:border-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-100";
const active =
  "cursor-pointer rounded-full border border-amber-500 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300";

/** Item page: favourite and "Da provare" toggles. */
export function ItemActions({
  lang,
  itemId,
  back,
  status,
  t,
}: {
  lang: string;
  itemId: string;
  back: string;
  status: { favorite: boolean; favorites: number; watchlist: boolean };
  t: Dictionary["itemActions"];
}) {
  const full = !status.favorite && status.favorites >= 4;
  const hidden = (on: boolean) => (
    <>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="on" value={on ? "1" : "0"} />
    </>
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <form action={setWatchlist}>
          {hidden(!status.watchlist)}
          <button type="submit" className={status.watchlist ? active : outline}>
            {status.watchlist ? t.unwatchlist : t.watchlist}
          </button>
        </form>
        <form action={setFavorite}>
          {hidden(!status.favorite)}
          <button type="submit" disabled={full} className={status.favorite ? active : outline}>
            {status.favorite ? t.unfavorite : `♥ ${t.favorite}`}
          </button>
        </form>
      </div>
      {full && <p className="text-xs text-zinc-500">{t.favoritesFull}</p>}
    </div>
  );
}
