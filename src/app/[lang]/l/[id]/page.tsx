import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getCurrentUserId, getList, getListEntries } from "@/lib/data/queries";
import { deleteList, moveInList, removeFromList } from "@/lib/lists/actions";
import { fill, formatDate, formatStars } from "@/lib/format";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ListItemSearch } from "@/components/ListItemSearch";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/l/[id]">): Promise<Metadata> {
  const { id } = await params;
  const list = await getList(id);
  return { title: list?.title ?? "Lista" };
}

const small =
  "cursor-pointer rounded-full px-2 py-0.5 text-sm text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800";

async function ListContent({ lang, id }: { lang: Locale; id: string }) {
  const dict = await getDictionary(lang);
  const t = dict.lists;
  const list = await getList(id);
  if (!list) notFound();
  const [entries, viewerId] = await Promise.all([
    getListEntries(list.id),
    getCurrentUserId(),
  ]);
  const own = viewerId === list.user_id;
  const owner = list.owner;

  const hidden = (itemId: string) => (
    <>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="listId" value={list.id} />
      <input type="hidden" name="itemId" value={itemId} />
    </>
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        {owner && (
          <Link
            href={`/${lang}/u/${owner.username}/lists`}
            className="text-sm text-zinc-500 hover:underline"
          >
            ← {owner.display_name || `@${owner.username}`}
          </Link>
        )}
        <h1 className="text-4xl font-semibold tracking-tight">{list.title}</h1>
        <p className="text-sm text-zinc-500">
          {list.items_count === 1
            ? t.itemsOne
            : fill(t.items, { n: String(list.items_count) })}{" "}
          · {fill(t.updated, { date: formatDate(list.updated_at, lang) })}
        </p>
        {list.description && (
          <p className="max-w-2xl whitespace-pre-line text-zinc-700 dark:text-zinc-300">
            {list.description}
          </p>
        )}
        {own && (
          <div className="mt-2 flex items-center gap-4">
            <Link
              href={`/${lang}/l/${list.id}/edit`}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
            >
              {t.edit}
            </Link>
            <form action={deleteList}>
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="listId" value={list.id} />
              <ConfirmButton
                label={t.delete}
                confirmText={t.confirmDelete}
                className="cursor-pointer text-sm text-zinc-500 hover:text-red-600 hover:underline"
              />
            </form>
          </div>
        )}
      </header>

      {own && <ListItemSearch listId={list.id} t={t} />}

      {entries.length === 0 ? (
        <p className="text-zinc-500">{own ? t.listEmptyOwn : t.listEmpty}</p>
      ) : (
        <ol className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {entries.map((entry, i) => {
            const item = entry.item;
            if (!item) return null;
            const href = item.category
              ? `/${lang}/c/${item.category.slug}/${item.slug}`
              : "#";
            return (
              <li key={item.id} className="flex items-center gap-4 py-3">
                {list.ranked && (
                  <span className="w-8 shrink-0 text-center text-2xl font-semibold tabular-nums text-zinc-400">
                    {i + 1}
                  </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={href}
                    className="truncate font-semibold hover:underline"
                  >
                    {item.name}
                  </Link>
                  {item.category && (
                    <Link
                      href={`/${lang}/c/${item.category.slug}`}
                      className="truncate text-sm text-zinc-500 hover:underline"
                    >
                      {item.category.name}
                    </Link>
                  )}
                </div>
                <span className="shrink-0 text-sm tabular-nums text-zinc-500">
                  ★ {formatStars(item.avg_rating)}
                </span>
                {own && (
                  <div className="flex shrink-0 items-center">
                    <form action={moveInList}>
                      {hidden(item.id)}
                      <input type="hidden" name="dir" value="up" />
                      <button
                        type="submit"
                        disabled={i === 0}
                        aria-label={t.moveUp}
                        title={t.moveUp}
                        className={small}
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveInList}>
                      {hidden(item.id)}
                      <input type="hidden" name="dir" value="down" />
                      <button
                        type="submit"
                        disabled={i === entries.length - 1}
                        aria-label={t.moveDown}
                        title={t.moveDown}
                        className={small}
                      >
                        ↓
                      </button>
                    </form>
                    <form action={removeFromList}>
                      {hidden(item.id)}
                      <button
                        type="submit"
                        aria-label={t.remove}
                        title={t.remove}
                        className={`${small} hover:text-red-600`}
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default async function ListPage({
  params,
}: PageProps<"/[lang]/l/[id]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Suspense fallback={<p className="text-zinc-500">…</p>}>
        {params.then(({ lang, id }) => {
          if (!hasLocale(lang)) notFound();
          return <ListContent lang={lang} id={id} />;
        })}
      </Suspense>
    </div>
  );
}
