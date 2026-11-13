import { photoUrl } from "@/lib/photos";

/** Thumbnails of a review's photos; each opens the full image. */
export function ReviewPhotos({
  photos,
  openLabel,
}: {
  photos: { id: string; storage_path: string; position: number }[] | undefined;
  openLabel: string;
}) {
  if (!photos?.length) return null;
  const sorted = [...photos].sort((a, b) => a.position - b.position);
  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((p) => (
        <a
          key={p.id}
          href={photoUrl(p.storage_path)}
          target="_blank"
          rel="noopener noreferrer"
          title={openLabel}
          className="block h-24 w-24 overflow-hidden rounded-lg bg-zinc-100 sm:h-28 sm:w-28 dark:bg-zinc-800"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl(p.storage_path)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition hover:scale-105" />
        </a>
      ))}
    </div>
  );
}
