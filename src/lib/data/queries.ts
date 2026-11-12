import "server-only";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import type {
  CategorySummary,
  Comment,
  ItemCard,
  ItemSummary,
  ListEntry,
  ListSummary,
  Profile,
  ProfileCard,
  ProfileStats,
  ReviewRow,
  Viewer,
} from "./types";

const REVIEW_FIELDS =
  "id, rating, body, contains_spoiler, created_at, likes_count, comments_count, user_id, author:profiles!reviews_user_id_profiles_id_fk(username, display_name, avatar_url)";
const REVIEW_WITH_ITEM = `${REVIEW_FIELDS}, item:items(name, slug, category:categories(name, slug))`;
const PROFILE_FIELDS =
  "id, username, display_name, avatar_url, bio, location, website, created_at";

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
    .select(
      "id, name, slug, description, items_count, reviews_count, followers_count, created_by",
    )
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
export async function getCategory(
  slug: string,
): Promise<CategorySummary | null> {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase
    .from("categories")
    .select(
      "id, name, slug, description, items_count, reviews_count, followers_count, created_by, status, merged_into_id",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  if (data.status === "merged" && data.merged_into_id) {
    const { data: target } = await supabase
      .from("categories")
      .select(
        "id, name, slug, description, items_count, reviews_count, followers_count, created_by",
      )
      .eq("id", data.merged_into_id)
      .maybeSingle();
    return (target as CategorySummary) ?? null;
  }
  return data as CategorySummary;
}

export async function getCategoryItems(
  categoryId: string,
  limit = 50,
): Promise<ItemSummary[]> {
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

export async function isFollowing(
  categoryId: string,
  userId: string | null,
): Promise<boolean> {
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

export async function getItem(
  categoryId: string,
  slug: string,
): Promise<ItemSummary | null> {
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
const usernamePattern = (username: string) =>
  username.replace(/[\\%_]/g, (c) => `\\${c}`);

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
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", id)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = await db();
  if (!supabase) return { reviews: 0, followers: 0, following: 0 };
  const head = { count: "exact" as const, head: true };
  const [reviews, followers, following] = await Promise.all([
    supabase
      .from("reviews")
      .select("id", head)
      .eq("user_id", userId)
      .eq("status", "active"),
    supabase
      .from("user_follows")
      .select("follower_id", head)
      .eq("followed_id", userId),
    supabase
      .from("user_follows")
      .select("followed_id", head)
      .eq("follower_id", userId),
  ]);
  return {
    reviews: reviews.count ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

export async function isFollowingUser(
  followerId: string | null,
  followedId: string,
): Promise<boolean> {
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
export async function getUserReviews(
  userId: string,
  limit = 500,
): Promise<ReviewRow[]> {
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
  return {
    id: userId,
    liked: (data ?? []).map((row) => row.review_id as string),
  };
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

const CARD_FIELDS = "id, username, display_name, avatar_url, bio";

/** Users whose username or display name contains `q`; newest users when `q` is empty. */
export async function searchProfiles(
  q: string,
  limit = 30,
): Promise<ProfileCard[]> {
  const supabase = await db();
  if (!supabase) return [];
  // Keep only characters that are safe inside a PostgREST or() filter.
  const term = q
    .replace(/[^\p{L}\p{N} _.-]/gu, "")
    .trim()
    .slice(0, 40);
  let query = supabase.from("profiles").select(CARD_FIELDS);
  if (term) {
    const like = `*${usernamePattern(term)}*`;
    query = query.or(`username.ilike.${like},display_name.ilike.${like}`);
  }
  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ProfileCard[];
}

/** Followers of, or people followed by, `userId`. */
export async function getFollowList(
  userId: string,
  kind: "followers" | "following",
): Promise<ProfileCard[]> {
  const supabase = await db();
  if (!supabase) return [];
  const [self, other] =
    kind === "followers"
      ? ["followed_id", "follower"]
      : ["follower_id", "followed"];
  const { data } = await supabase
    .from("user_follows")
    .select(
      `profile:profiles!user_follows_${other}_id_profiles_id_fk(${CARD_FIELDS})`,
    )
    .eq(self, userId)
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data ?? []) as unknown as { profile: ProfileCard | null }[])
    .map((row) => row.profile)
    .filter((p): p is ProfileCard => p !== null);
}

/** Which of `ids` the signed-in user follows. */
export async function getFollowedIds(
  viewerId: string | null,
  ids: string[],
): Promise<string[]> {
  if (!viewerId || ids.length === 0) return [];
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("user_follows")
    .select("followed_id")
    .eq("follower_id", viewerId)
    .in("followed_id", ids);
  return (data ?? []).map((row) => row.followed_id as string);
}

// ---------------------------------------------------------------------------
// Single review (edit page)
// ---------------------------------------------------------------------------

export async function getReview(
  id: string,
): Promise<(ReviewRow & { item_id: string; category_id: string }) | null> {
  const supabase = await db();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from("reviews")
    .select(
      `${REVIEW_FIELDS}, item_id, item:items(name, slug, category_id, category:categories(name, slug))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as ReviewRow & {
    item_id: string;
    item: { category_id: string };
  };
  return { ...row, category_id: row.item.category_id };
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

const LIST_FIELDS =
  "id, user_id, title, description, ranked, items_count, updated_at, owner:profiles!lists_user_id_profiles_id_fk(username, display_name)";

export async function getUserLists(userId: string): Promise<ListSummary[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("lists")
    .select(LIST_FIELDS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(200);
  return (data ?? []) as unknown as ListSummary[];
}

export async function getRecentLists(limit = 6): Promise<ListSummary[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("lists")
    .select(LIST_FIELDS)
    .gt("items_count", 0)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ListSummary[];
}

export async function getList(id: string): Promise<ListSummary | null> {
  const supabase = await db();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from("lists")
    .select(LIST_FIELDS)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as ListSummary) ?? null;
}

export async function getListEntries(listId: string): Promise<ListEntry[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("list_items")
    .select(
      "position, item:items(id, name, slug, avg_rating, reviews_count, category:categories(name, slug))",
    )
    .eq("list_id", listId)
    .order("position", { ascending: true })
    .limit(500);
  return (data ?? []) as unknown as ListEntry[];
}

/** First items of each list, for the small previews on list cards. */
export async function getListPreviews(
  listIds: string[],
): Promise<Record<string, string[]>> {
  const supabase = await db();
  if (!supabase || listIds.length === 0) return {};
  const { data } = await supabase
    .from("list_items")
    .select("list_id, position, item:items(name)")
    .in("list_id", listIds)
    .order("position", { ascending: true })
    .limit(listIds.length * 20);
  const out: Record<string, string[]> = {};
  for (const row of (data ?? []) as unknown as {
    list_id: string;
    item: { name: string } | null;
  }[]) {
    const names = (out[row.list_id] ??= []);
    if (row.item && names.length < 4) names.push(row.item.name);
  }
  return out;
}

/** The signed-in user's lists, each with whether it already contains `itemId`. */
export async function getMyListsFor(
  userId: string,
  itemId: string,
): Promise<{ id: string; title: string; has: boolean }[]> {
  const supabase = await db();
  if (!supabase) return [];
  const [{ data: mine }, { data: holding }] = await Promise.all([
    supabase
      .from("lists")
      .select("id, title")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase.from("list_items").select("list_id").eq("item_id", itemId),
  ]);
  const has = new Set((holding ?? []).map((row) => row.list_id as string));
  return (mine ?? []).map((l) => ({
    id: l.id as string,
    title: l.title as string,
    has: has.has(l.id as string),
  }));
}

// ---------------------------------------------------------------------------
// Activity, favourites, "Da provare", comments
// ---------------------------------------------------------------------------

/** Reviews by the people `userId` follows, newest first. `following` = how many they follow. */
export async function getActivity(
  userId: string,
  limit = 50,
): Promise<{ reviews: ReviewRow[]; following: number }> {
  const supabase = await db();
  if (!supabase) return { reviews: [], following: 0 };
  const { data: follows } = await supabase
    .from("user_follows")
    .select("followed_id")
    .eq("follower_id", userId)
    .limit(1000);
  const ids = (follows ?? []).map((f) => f.followed_id as string);
  if (ids.length === 0) return { reviews: [], following: 0 };
  const { data } = await supabase
    .from("reviews")
    .select(REVIEW_WITH_ITEM)
    .in("user_id", ids)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { reviews: (data ?? []) as unknown as ReviewRow[], following: ids.length };
}

const ITEM_CARD = "item:items(id, name, slug, avg_rating, category:categories(name, slug))";

export async function getFavorites(userId: string): Promise<ItemCard[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profile_favorites")
    .select(`position, ${ITEM_CARD}`)
    .eq("user_id", userId)
    .order("position", { ascending: true });
  return ((data ?? []) as unknown as { item: ItemCard | null }[])
    .map((row) => row.item)
    .filter((i): i is ItemCard => i !== null);
}

export async function getWatchlist(userId: string): Promise<ItemCard[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("watchlist")
    .select(`created_at, ${ITEM_CARD}`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  return ((data ?? []) as unknown as { item: ItemCard | null }[])
    .map((row) => row.item)
    .filter((i): i is ItemCard => i !== null);
}

/** Whether an item is in the user's favourites / "Da provare", and how many favourites they have. */
export async function getItemStatus(
  userId: string,
  itemId: string,
): Promise<{ favorite: boolean; favorites: number; watchlist: boolean }> {
  const supabase = await db();
  if (!supabase) return { favorite: false, favorites: 0, watchlist: false };
  const [{ data: favs }, { data: watch }] = await Promise.all([
    supabase.from("profile_favorites").select("item_id").eq("user_id", userId),
    supabase.from("watchlist").select("item_id").eq("user_id", userId).eq("item_id", itemId).maybeSingle(),
  ]);
  const list = favs ?? [];
  return {
    favorite: list.some((f) => f.item_id === itemId),
    favorites: list.length,
    watchlist: Boolean(watch),
  };
}

export async function getComments(reviewId: string): Promise<Comment[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("review_comments")
    .select(
      "id, body, created_at, user_id, author:profiles!review_comments_user_id_profiles_id_fk(username, display_name, avatar_url)",
    )
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true })
    .limit(500);
  return (data ?? []) as unknown as Comment[];
}
