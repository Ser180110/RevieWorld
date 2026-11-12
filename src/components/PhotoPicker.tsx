"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAX_PHOTO_BYTES, MAX_REVIEW_PHOTOS, PHOTO_TYPES, photoUrl } from "@/lib/photos";

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
  t: { label: string; add: string; uploading: string; hint: string; error: string; remove: string };
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
      const ext = PHOTO_TYPES[file.type];
      if (!ext || file.size > MAX_PHOTO_BYTES) {
        setError(true);
        continue;
      }
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: err } = await supabase.storage
        .from("review-photos")
        .upload(path, file, { contentType: file.type });
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

  const thumb = (key: string, path: string, onRemove: () => void) => (
    <div key={key} className="relative h-20 w-20 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl(path)} alt="" className="h-full w-full object-cover" />
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
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-center text-xs text-zinc-500 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100">
            <span className="text-2xl leading-none">{busy ? "…" : "📷"}</span>
            {busy ? t.uploading : t.add}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <span className={`text-xs ${error ? "text-red-600" : "text-zinc-500"}`}>{error ? t.error : t.hint}</span>
    </div>
  );
}
