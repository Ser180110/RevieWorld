"use server";

import { z } from "zod";
import { db, getBlockedIds, getCurrentUserId } from "@/lib/data/queries";
import { styleOf } from "@/lib/categoryStyle";
import type { MapFeed, MapPin, MapResult } from "./types";

const boxSchema = z.object({
  south: z.number().min(-90).max(90),
  north: z.number().min(-90).max(90),
  west: z.number().min(-180).max(180),
  east: z.number().min(-180).max(180),
});

const MAX_PINS = 300;

/** Reviews with a position inside the visible part of the map. */
export async function reviewsInArea(box: z.infer<typeof boxSchema>, feed: MapFeed, lang: string): Promise<MapResult> {
  const parsed = boxSchema.safeParse(box);
  if (!parsed.success) return { pins: [] };
  const { south, north, west, east } = parsed.data;
  const supabase = await db();
  if (!supabase) return { pins: [] };

  let authors: string[] | null = null;
  if (feed === "following") {
    const userId = await getCurrentUserId();
    if (!userId) return { pins: [], error: "auth" };
    const { data: follows } = await supabase.from("user_follows").select("followed_id").eq("follower_id", userId).limit(1000);
    authors = (follows ?? []).map((f) => f.followed_id as string);
    if (authors.length === 0) return { pins: [] };
  }

  let query = supabase
    .from("reviews")
    .select(
      "id, lat, lng, rating, user_id, author:profiles!reviews_user_id_profiles_id_fk(username), item:items(name, slug, category:categories(name, slug, icon))",
    )
    .eq("status", "active")
    .gte("lat", south)
    .lte("lat", north)
    .not("lat", "is", null);
  // The visible area can cross the 180° line.
  query = west <= east ? query.gte("lng", west).lte("lng", east) : query.or(`lng.gte.${west},lng.lte.${east}`);
  if (authors) query = query.in("user_id", authors);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(MAX_PINS);
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204") return { pins: [], error: "unavailable" };
    console.error("reviewsInArea", error);
    return { pins: [] };
  }
  const blocked = await getBlockedIds();
  type Row = {
    id: string;
    lat: number;
    lng: number;
    rating: number;
    user_id: string;
    author: { username: string } | null;
    item: { name: string; slug: string; category: { name: string; slug: string; icon: string | null } | null } | null;
  };
  const pins: MapPin[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    if (blocked.has(r.user_id) || !r.item?.category) continue;
    pins.push({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      rating: r.rating,
      item: r.item.name,
      itemHref: `/${lang}/c/${r.item.category.slug}/${r.item.slug}`,
      category: r.item.category.name,
      emoji: styleOf(r.item.category).emoji,
      author: r.author?.username ?? "?",
    });
  }
  return { pins };
}
