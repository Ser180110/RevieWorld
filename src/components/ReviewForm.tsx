"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Suggestion } from "@/lib/data/types";
import { submitReview, suggestItems } from "@/lib/reviews/actions";
import { PhotoPicker } from "./PhotoPicker";
import { StickerPicker } from "./StickerPicker";
import { splitSticker, type Attachment } from "@/lib/stickers";
import { StarInput } from "./StarInput";
import { count } from "@/lib/format";
import { useDebounced } from "./useDebounced";

const field =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100";

type Props = {
  lang: string;
  categoryId: string;
  categorySlug: string;
  /** Set on an item page: the review is for this item. */
  item?: { id: string; name: string };
  existing?: {
    rating: number;
    body: string | null;
    contains_spoiler: boolean;
    photos?: { id: string; storage_path: string }[];
  };
  /** Signed-in user: photos are uploaded to their folder. */
  userId: string;
  t: Dictionary["reviewForm"];
  common: Dictionary["common"];
  /** Where to go after saving (default: the item page). */
  back?: string;
};

export function ReviewForm({
  lang,
  categoryId,
  categorySlug,
  item,
  existing,
  userId,
  t,
  common,
  back,
}: Props) {
  const [state, formAction, pending] = useActionState(submitReview, {});
  const initial = splitSticker(existing?.body);
  const [sticker, setSticker] = useState<Attachment | null>(initial.sticker);
  const [itemName, setItemName] = useState("");
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const debounced = useDebounced(itemName.trim());
  const [results, setResults] = useState<{ q: string; list: Suggestion[] }>({
    q: "",
    list: [],
  });

  useEffect(() => {
    if (item || picked || debounced.length < 2) return;
    let active = true;
    suggestItems(categoryId, debounced).then((list) => {
      if (active) setResults({ q: debounced, list });
    });
    return () => {
      active = false;
    };
  }, [debounced, categoryId, item, picked]);

  const suggestions = !picked && results.q === debounced ? results.list : [];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="categorySlug" value={categorySlug} />
      {back && <input type="hidden" name="back" value={back} />}
      {item && <input type="hidden" name="itemId" value={item.id} />}
      {picked && <input type="hidden" name="itemId" value={picked.id} />}

      {!item && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t.itemLabel}</span>
            <input
              name={picked ? undefined : "itemName"}
              value={picked ? picked.name : itemName}
              readOnly={Boolean(picked)}
              onChange={(e) => setItemName(e.target.value)}
              placeholder={t.itemPlaceholder}
              maxLength={120}
              className={`${field} h-11`}
            />
          </label>
          {picked && (
            <button
              type="button"
              onClick={() => setPicked(null)}
              aria-label="Reset"
              className="self-start text-sm text-zinc-500 underline"
            >
              ✕
            </button>
          )}
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                {t.itemSuggestions}
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setPicked(s)}
                    className="rounded-full border border-zinc-300 px-3 py-1 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
                  >
                    {s.name} ·{" "}
                    {count(s.reviews_count, common.review, common.reviews)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <StarInput
        name="rating"
        label={t.ratingLabel}
        defaultValue={existing?.rating ?? 0}
      />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.bodyLabel}</span>
        <textarea
          name="body"
          rows={4}
          maxLength={4950}
          defaultValue={initial.text}
          placeholder={t.bodyPlaceholder}
          className={`${field} py-2`}
        />
      </label>

      <StickerPicker lang={lang} value={sticker} onChange={setSticker} t={{ add: t.stickerAdd, remove: t.stickerRemove }} />

      <PhotoPicker
        userId={userId}
        existing={existing?.photos ?? []}
        t={{
          label: t.photosLabel,
          add: t.photosAdd,
          camera: t.photosCamera,
          uploading: t.photosUploading,
          hint: t.photosHint,
          error: t.photosError,
          remove: t.photosRemove,
        }}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="spoiler"
          defaultChecked={existing?.contains_spoiler}
        />
        {t.spoiler}
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error === "auth" ? (
            <Link href={`/${lang}/login`} className="underline">
              {t.errors.auth}
            </Link>
          ) : (
            t.errors[state.error]
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-zinc-900 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? t.saving : existing ? t.update : t.submit}
      </button>
    </form>
  );
}
