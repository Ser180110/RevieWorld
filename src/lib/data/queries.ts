import "server-only";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import type { CategorySummary, ItemSummary, Profile, ProfileStats, ReviewRow, Viewer } from "./types";

const REVIEW_FIELDS =
  "id, rating, body, contains_spoiler, created_at, likes_count, user_id, author:profiles!reviews_user_id_profiles_id_fk(username, display_name, avatar_url)";
const REVIEW_WITH_ITEM = `${REVIEW_FIELDS}, item:items(name, slug, category:categories(name, slug))`;
const PROFILE_FIELDS = "id, username, display_name, avatar_url, bio, location, website, created_at";

/** Supabase client for request-time reads, or null when Supabase is not configured. */
export async function db() {
  await connection();
  if (!supabaseEnv()) return null;
  return createClient();
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getRecentReviews(limit = 12): Promise<ReviewRow[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select(REVIEW_WITH_ITEM)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ReviewRow[];
}

export async function getTopCategories(limit = 8): Promise<CategorySummary[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, items_count, reviews_count, followers_count, created_by")
    .eq("status", "active")
    .order("reviews_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as CategorySummary[];
}

/**
 * Category by slug. A merged category resolves to the one it was merged into,
 * so old links keep working.
 */
export async function getCategory(slug: string): Promise<CategorySummary | null> {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, items_count, reviews_count, followers_count, created_by, status, merged_into_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  if (data.status === "merged" && data.merged_into_id) {
    const { data: target } = await supabase
      .from("categories")
      .select("id, name, slug, description, items_count, reviews_count, followers_count, created_by")
      .eq("id", data.merged_into_id)
      .maybeSingle();
    return (target as CategorySummary) ?? null;
  }
  return data as CategorySummary;
}

export async function getCategoryItems(categoryId: string, limit = 50): Promise<ItemSummary[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("items")
    .select("id, name, slug, description, reviews_count, avg_rating")
    .eq("category_id", categoryId)
    .eq("status", "active")
    .order("avg_rating", { ascending: false, nullsFirst: false })
    .order("reviews_count", { ascending: false })
    .limit(limit);
  return (data ?? []) as ItemSummary[];
}

export async function isFollowing(categoryId: string, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const supabase = await db();
  if (!supabase) return false;
  const { data } = await supabase
    .from("category_follows")
    .select("user_id")
    .eq("category_id", categoryId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function getItem(categoryId: string, slug: string): Promise<ItemSummary | null> {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase
    .from("items")
    .select("id, name, slug, description, reviews_count, avg_rating")
    .eq("category_id", categoryId)
    .eq("slug", slug)
    .maybeSingle();
  return (data as ItemSummary) ?? null;
}

export async function getItemReviews(itemId: string): Promise<ReviewRow[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select(REVIEW_FIELDS)
    .eq("item_id", itemId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as ReviewRow[];
}

// ---------------------------------------------------------------------------
// Profiles, follows and likes
// ---------------------------------------------------------------------------

/** Exact, case-insensitive match ("_" is a wildcard in ILIKE, so escape it). */
const usernamePattern = (username: string) => username.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function getProfile(username: string): Promise<Profile | null> {
  const supabase = await db();
  if (!supabase || !/^[a-zA-Z0-9_]{3,30}$/.test(username)) return null;
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .ilike("username", usernamePattern(username))
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select(PROFILE_FIELDS).eq("id", id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = await db();
  if (!supabase) return { reviews: 0, followers: 0, following: 0 };
  const head = { count: "exact" as const, head: true };
  const [reviews, followers, following] = await Promise.all([
    supabase.from("reviews").select("id", head).eq("user_id", userId).eq("status", "active"),
    supabase.from("user_follows").select("follower_id", head).eq("followed_id", userId),
    supabase.from("user_follows").select("followed_id", head).eq("follower_id", userId),
  ]);
  return {
    reviews: reviews.count ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

export async function isFollowingUser(followerId: string | null, followedId: string): Promise<boolean> {
  if (!followerId || followerId === followedId) return false;
  const supabase = await db();
  if (!supabase) return false;
  const { data } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("followed_id", followedId)
    .maybeSingle();
  return Boolean(data);
}

/** A user's reviews, newest first (the diary). */
export async function getUserReviews(userId: string, limit = 500): Promise<ReviewRow[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select(REVIEW_WITH_ITEM)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ReviewRow[];
}

/** The signed-in user and which of `reviews` they liked. */
export async function getViewer(reviews: { id: string }[]): Promise<Viewer> {
  const userId = await getCurrentUserId();
  if (!userId || reviews.length === 0) return { id: userId, liked: [] };
  const supabase = await db();
  if (!supabase) return { id: userId, liked: [] };
  const { data } = await supabase
    .from("review_likes")
    .select("review_id")
    .eq("user_id", userId)
    .in(
      "review_id",
      reviews.map((r) => r.id),
    );
  return { id: userId, liked: (data ?? []).map((row) => row.review_id as string) };
}
