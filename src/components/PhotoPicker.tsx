"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { MAX_PHOTO_BYTES, MAX_REVIEW_PHOTOS, photoUrl } from "@/lib/photos";

type Existing = { id: string; storage_path: string };

/**
 * Uploads review photos straight to Storage (folder = user id) and puts the
 * paths in hidden inputs: `photo` for new ones, `removePhoto` for removed ones.
 */
export function PhotoPicker({
  userId,
  existing = [],
  t,
}: {
  userId: string;
  existing?: Existing[];
  t: { label: string; add: string; camera: string; uploading: string; hint: string; error: string; remove: string };
}) {
  const [kept, setKept] = useState(existing);
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const total = kept.length + added.length;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(false);
    setBusy(true);
    const supabase = createClient();
    const room = MAX_REVIEW_PHOTOS - total;
    const paths: string[] = [];
    for (const file of [...files].slice(0, room)) {
      const photo = await compressImage(file, { maxBytes: MAX_PHOTO_BYTES });
      if (!photo) {
        setError(true);
        continue;
      }
      const path = `${userId}/${crypto.randomUUID()}.${photo.ext}`;
      const { error: err } = await supabase.storage
        .from("review-photos")
        .upload(path, photo.blob, { contentType: photo.type, cacheControl: "31536000" });
      if (err) {
        console.error("photo upload", err);
        setError(true);
      } else {
        paths.push(path);
      }
    }
    setAdded((a) => [...a, ...paths]);
    setBusy(false);
  }

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    upload(e.target.files);
    e.target.value = "";
  };
  const tile =
    "flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 text-center text-xs text-zinc-500 transition hover:border-violet-500 hover:text-violet-600 dark:border-zinc-700 dark:hover:border-violet-400 dark:hover:text-violet-300";

  const thumb = (key: string, path: string, onRemove: () => void) => (
    <div key={key} className="relative h-20 w-20 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl(path)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label={t.remove}
        title={t.remove}
        className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black"
      >
        ✕
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{t.label}</span>
      {added.map((p) => (
        <input key={p} type="hidden" name="photo" value={p} />
      ))}
      {removed.map((id) => (
        <input key={id} type="hidden" name="removePhoto" value={id} />
      ))}
      <div className="flex flex-wrap items-center gap-3">
        {kept.map((p) =>
          thumb(p.id, p.storage_path, () => {
            setKept((k) => k.filter((x) => x.id !== p.id));
            setRemoved((r) => [...r, p.id]);
          }),
        )}
        {added.map((path) => thumb(path, path, () => setAdded((a) => a.filter((x) => x !== path))))}
        {total < MAX_REVIEW_PHOTOS && (
          <>
            {/* Two pickers: Android browsers (e.g. Samsung Internet) only offer the
                camera when the input asks for it with `capture`. */}
            <label className={tile}>
              <span className="text-2xl leading-none">{busy ? "…" : "📷"}</span>
              {busy ? t.uploading : t.camera}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={busy}
                onChange={pick}
              />
            </label>
            <label className={tile}>
              <span className="text-2xl leading-none">{busy ? "…" : "🖼️"}</span>
              {busy ? t.uploading : t.add}
              <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={pick} />
            </label>
          </>
        )}
      </div>
      <span className={`text-xs ${error ? "text-red-600" : "text-zinc-500"}`}>{error ? t.error : t.hint}</span>
    </div>
  );
}
