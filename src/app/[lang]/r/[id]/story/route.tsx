import { type NextRequest } from "next/server";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getReview } from "@/lib/data/queries";
import { styleOf } from "@/lib/categoryStyle";
import { photoUrl } from "@/lib/photos";
import { splitSticker } from "@/lib/stickers";
import { toPlain } from "@/lib/richtext";
import { storyCard } from "@/lib/og/story";

/** The review as a 1080×1920 PNG, to post in Instagram / WhatsApp stories. */
export async function GET(request: NextRequest, { params }: RouteContext<"/[lang]/r/[id]/story">) {
  const { lang, id } = await params;
  const dict = await getDictionary(hasLocale(lang) ? lang : "it");
  const review = await getReview(id);
  const category = review?.item?.category;
  if (!review || !review.item || !category) return new Response("Not found", { status: 404 });
  const style = styleOf(category);
  const photo = [...(review.photos ?? [])].sort((a, b) => a.position - b.position)[0];
  const image = await storyCard({
    emoji: style.emoji,
    color: style.color,
    category: category.name,
    item: review.item.name,
    rating: review.rating,
    body: toPlain(splitSticker(review.body).text, "🙈") || null,
    author: review.author?.display_name || `@${review.author?.username ?? ""}`,
    photo: photo ? photoUrl(photo.storage_path) : null,
    cta: dict.story.cta,
    site: request.nextUrl.host,
  });
  image.headers.set("Content-Disposition", `inline; filename="revieworld-${id.slice(0, 8)}.png"`);
  image.headers.set("Cache-Control", "public, max-age=300");
  return image;
}
