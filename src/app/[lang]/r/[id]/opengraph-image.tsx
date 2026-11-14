import { getReview } from "@/lib/data/queries";
import { photoUrl } from "@/lib/photos";
import { splitSticker } from "@/lib/stickers";
import { OG_SIZE, ogCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "RevieWorld";

/** Share picture of a review: photo, item, stars, text, author. */
export default async function Image({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { id } = await params;
  const review = await getReview(id);
  if (!review) return ogCard({ title: "RevieWorld" });
  const photo = [...(review.photos ?? [])].sort((a, b) => a.position - b.position)[0];
  return ogCard({
    kicker: review.item?.category?.name,
    title: review.item?.name ?? "RevieWorld",
    rating: review.rating,
    body: review.contains_spoiler ? null : splitSticker(review.body).text || null,
    footer: review.author?.display_name || `@${review.author?.username ?? ""}`,
    photo: photo ? photoUrl(photo.storage_path) : null,
  });
}
