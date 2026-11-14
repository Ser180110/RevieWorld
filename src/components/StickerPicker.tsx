"use client";

import { useEffect, useState } from "react";
import { searchGiphy, type GiphyItem } from "@/lib/giphy/actions";
import { STICKERS, attachmentValue, giphyUrl, type Attachment, type StickerKey } from "@/lib/stickers";
import { Sticker } from "./Sticker";
import { useDebounced } from "./useDebounced";

type Tab = "gsticker" | "gif" | "classic";

const LABELS = {
  it: { gsticker: "Sticker", gif: "GIF", classic: "Classici", search: "Cerca sticker e GIF…", empty: "Nessun risultato", loading: "Carico…" },
  en: { gsticker: "Stickers", gif: "GIFs", classic: "Classic", search: "Search stickers and GIFs…", empty: "No results", loading: "Loading…" },
};

/**
 * Choose (or remove) one attachment: a GIPHY sticker or GIF (like on
 * Instagram and TikTok), or one of our badge stickers. Sends it as the
 * hidden field `sticker`.
 */
export function StickerPicker({
  lang,
  value,
  onChange,
  t,
}: {
  lang: string;
  value: Attachment | null;
  onChange: (a: Attachment | null) => void;
  t: { add: string; remove: string };
}) {
  const L = lang === "en" ? LABELS.en : LABELS.it;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("gsticker");
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim());
  // null = GIPHY is not set up: only the classic stickers.
  const [giphyOn, setGiphyOn] = useState(true);
  const [results, setResults] = useState<{ key: string; list: GiphyItem[] }>({ key: "", list: [] });

  const key = `${tab}|${q}`;
  const giphyTab = giphyOn && tab !== "classic";

  useEffect(() => {
    if (!open || !giphyTab) return;
    let live = true;
    searchGiphy(tab as "gif" | "gsticker", q, lang).then(
      (list) => {
        if (!live) return;
        if (list === null) setGiphyOn(false);
        else setResults({ key, list });
      },
      () => live && setResults({ key, list: [] }),
    );
    return () => {
      live = false;
    };
  }, [open, giphyTab, tab, q, lang, key]);

  const pick = (a: Attachment) => {
    onChange(a);
    setOpen(false);
  };
  const loading = results.key !== key;
  const shownTab: Tab = giphyOn ? tab : "classic";

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="sticker" value={attachmentValue(value)} />
      <div className="flex flex-wrap items-center gap-3">
        {value && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="cursor-pointer">
            <Sticker a={value} lang={lang} size="sm" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-zinc-300 px-3 py-1 text-sm hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
        >
          🏷️ {t.add}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="cursor-pointer text-sm text-zinc-500 hover:underline">
            {t.remove}
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          {giphyOn && (
            <div className="flex gap-1 rounded-full bg-zinc-200/70 p-1 text-sm font-medium dark:bg-zinc-800">
              {(["gsticker", "gif", "classic"] as Tab[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  aria-pressed={k === tab}
                  className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 transition ${
                    k === tab ? "bg-white shadow-sm dark:bg-zinc-950" : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {L[k]}
                </button>
              ))}
            </div>
          )}

          {shownTab === "classic" ? (
            <div className="flex flex-wrap gap-3">
              {(Object.keys(STICKERS) as StickerKey[]).map((k) => {
                const active = value?.kind === "sticker" && value.key === k;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={active}
                    onClick={() => pick({ kind: "sticker", key: k })}
                    className={`cursor-pointer rounded-2xl p-0.5 transition hover:scale-110 ${active ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""}`}
                  >
                    <Sticker a={{ kind: "sticker", key: k }} lang={lang} size="sm" />
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={L.search}
                enterKeyHint="search"
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                className="h-10 w-full rounded-full border border-zinc-300 bg-white px-4 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
              />
              <div
                className={`max-h-80 overflow-y-auto rounded-xl ${
                  tab === "gsticker"
                    ? "bg-[conic-gradient(#e4e4e7_25%,transparent_0_50%,#e4e4e7_0_75%,transparent_0)] bg-[length:16px_16px] dark:bg-[conic-gradient(#27272a_25%,transparent_0_50%,#27272a_0_75%,transparent_0)]"
                    : ""
                }`}
              >
                {loading && results.list.length === 0 ? (
                  <p className="p-4 text-center text-sm text-zinc-500">{L.loading}</p>
                ) : !loading && results.list.length === 0 ? (
                  <p className="p-4 text-center text-sm text-zinc-500">{L.empty}</p>
                ) : (
                  <div className={`columns-3 gap-2 p-1 transition-opacity sm:columns-4 ${loading ? "opacity-50" : ""}`}>
                    {results.list.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        title={g.title}
                        onClick={() => pick({ kind: tab as "gif" | "gsticker", id: g.id })}
                        className="mb-2 block w-full cursor-pointer break-inside-avoid overflow-hidden rounded-lg transition hover:scale-105"
                        style={{ aspectRatio: `${g.w} / ${g.h}` }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={giphyUrl(g.id, true)} alt={g.title} loading="lazy" decoding="async" className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Powered by GIPHY</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
