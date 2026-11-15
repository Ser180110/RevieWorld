import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { createClient, getSessionUserId } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { normalizeName } from "@/lib/normalize";
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
  "id, rating, body, contains_spoiler, created_at, likes_count, comments_count, user_id, author:profiles!reviews_user_id_profiles_id_fk(username, display_name, avatar_url), photos:review_photos(id, storage_path, position)";
const REVIEW_WITH_ITEM = `${REVIEW_FIELDS}, item:items(name, slug, category:categories(name, slug, icon, color))`;
const CATEGORY_FIELDS =
  "id, name, slug, description, items_count, reviews_count, followers_count, created_by, normalized_name, icon, color";
const PROFILE_FIELDS =
  "id, username, display_name, avatar_url, bio, location, website, created_at";
/** With the founder badge and the profile look (migrations 0017-0018). */
const PROFILE_FIELDS_BADGE = `${PROFILE_FIELDS}, badge, theme_bg, theme_emoji`;

/** Supabase client for request-time reads, or null when Supabase is not configured. */
export async function db() {
  await connection();
  if (!supabaseEnv()) return null;
  return createClient();
}

export async function getCurrentUserId(): Promise<string | null> {
  await connection();
  if (!supabaseEnv()) return null;
  return getSessionUserId();
}

/** Signed-in user's username and avatar (header), once per request. */
export const getCurrentProfile = cache(async function getCurrentProfile(): Promise<{
  id: string;
  username: string;
  avatar_url: string | null;
} | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, username, avatar_url").eq("id", userId).maybeSingle();
  return data ?? { id: userId, username: "", avatar_url: null };
});


/** People the signed-in user blocked (their reviews and comments are hidden from them). */
export const getBlockedIds = cache(async function getBlockedIds(): Promise<Set<string>> {
  const supabase = await db();
  if (!supabase) return new Set();
  const userId = await getSessionUserId();
  if (!userId) return new Set();
  const { data, error } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", userId).limit(1000);
  if (error || !data) return new Set();
  return new Set((data as { blocked_id: string }[]).map((b) => b.blocked_id));
});

async function withoutBlocked<T extends { user_id: string }>(rows: T[]): Promise<T[]> {
  if (!rows.length) return rows;
  const blocked = await getBlockedIds();
  return blocked.size ? rows.filter((r) => !blocked.has(r.user_id)) : rows;
}

export async function getRecentReviews(limit = 12, offset = 0): Promise<ReviewRow[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select(REVIEW_WITH_ITEM)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return withoutBlocked((data ?? []) as unknown as ReviewRow[]);
}


// ---------------------------------------------------------------------------
// Category totals: a category also counts what is inside its subcategories
// ---------------------------------------------------------------------------

type CategoryTree = {
  kids: Map<string, string[]>;
  own: Map<string, { reviews: number; items: number }>;
};

/** Every active category with its parent, once per request (null before migration 0023). */
const getCategoryTree = cache(async function getCategoryTree(): Promise<CategoryTree | null> {
  const supabase = await db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, reviews_count, items_count")
    .eq("status", "active")
    .limit(5000);
  if (error || !data) return null;
  const kids = new Map<string, string[]>();
  const own = new Map<string, { reviews: number; items: number }>();
  for (const c of data as { id: string; parent_id: string | null; reviews_count: number; items_count: number }[]) {
    own.set(c.id, { reviews: c.reviews_count, items: c.items_count });
    if (c.parent_id) kids.set(c.parent_id, [...(kids.get(c.parent_id) ?? []), c.id]);
  }
  return { kids, own };
});

/** The category and all its subcategories, at any depth. */
function subtree(tree: CategoryTree, id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    out.push(cur);
    stack.push(...(tree.kids.get(cur) ?? []));
  }
  return out;
}

/** Ids whose reviews show on a category page: itself and its subcategories. */
export async function getCategorySubtreeIds(categoryId: string): Promise<string[]> {
  const tree = await getCategoryTree();
  return tree ? subtree(tree, categoryId) : [categoryId];
}

/** Reviews and items counted together with the subcategories. */
async function withTotals<T extends CategorySummary>(list: T[], resort = false): Promise<T[]> {
  if (!list.length) return list;
  const tree = await getCategoryTree();
  if (!tree || !tree.kids.size) return list;
  const out = list.map((c) => {
    const ids = subtree(tree, c.id);
    if (ids.length === 1) return c;
    let reviews = 0;
    let items = 0;
    for (const id of ids) {
      const n = id === c.id ? { reviews: c.reviews_count, items: c.items_count } : tree.own.get(id);
      reviews += n?.reviews ?? 0;
      items += n?.items ?? 0;
    }
    return { ...c, reviews_count: reviews, items_count: items };
  });
  return resort ? out.sort((a, b) => b.reviews_count - a.reviews_count) : out;
}

export async function getTopCategories(limit = 8): Promise<CategorySummary[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select(
      CATEGORY_FIELDS,
    )
    .eq("status", "active")
    .order("reviews_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit * 3);
  return (await withTotals((data ?? []) as CategorySummary[], true)).slice(0, limit);
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
      `${CATEGORY_FIELDS}, status, merged_into_id`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  if (data.status === "merged" && data.merged_into_id) {
    const { data: target } = await supabase
      .from("categories")
      .select(
        CATEGORY_FIELDS,
      )
      .eq("id", data.merged_into_id)
      .maybeSingle();
    return target ? (await withTotals([target as CategorySummary]))[0] : null;
  }
  return (await withTotals([data as CategorySummary]))[0];
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
  const items = (data ?? []) as ItemSummary[];
  const covers = await getItemCovers(items.map((i) => i.id));
  return items.map((i) => ({ ...i, cover: covers[i.id] ?? null }));
}

/** One photo per item (from its most recent review with photos). */
export async function getItemCovers(itemIds: string[]): Promise<Record<string, string>> {
  const supabase = await db();
  if (!supabase || itemIds.length === 0) return {};
  const { data } = await supabase
    .from("reviews")
    .select("item_id, created_at, photos:review_photos(storage_path, position)")
    .in("item_id", itemIds)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1000);
  const covers: Record<string, string> = {};
  for (const row of (data ?? []) as unknown as {
    item_id: string;
    photos: { storage_path: string; position: number }[] | null;
  }[]) {
    const first = [...(row.photos ?? [])].sort((a, b) => a.position - b.position)[0];
    if (first && !covers[row.item_id]) covers[row.item_id] = first.storage_path;
  }
  return covers;
}

/** All active categories, most reviewed first. */
/** Categories a user created ("founded"), most reviewed first. */
export async function getFoundedCategories(userId: string, limit = 24): Promise<CategorySummary[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .eq("created_by", userId)
    .eq("status", "active")
    .order("reviews_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  const list = await withTotals((data ?? []) as CategorySummary[]);
  if (!list.length) return list;
  // Subcategories: say which category they are inside of (needs migration 0023).
  const { data: links, error } = await supabase
    .from("categories")
    .select("id, parent_id")
    .in("id", list.map((c) => c.id));
  if (error || !links) return list;
  const parentOf = new Map(
    (links as { id: string; parent_id: string | null }[]).filter((l) => l.parent_id).map((l) => [l.id, l.parent_id!]),
  );
  if (!parentOf.size) return list;
  const { data: parents } = await supabase
    .from("categories")
    .select("id, name")
    .in("id", [...new Set(parentOf.values())]);
  const nameOf = new Map(((parents ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  return list.map((c) => {
    const parent = parentOf.get(c.id);
    return parent && nameOf.has(parent) ? { ...c, parent_name: nameOf.get(parent)! } : c;
  });
}

/** Top-level categories only: subcategories are shown inside their parent. */
export async function getMainCategories(limit = 300): Promise<CategorySummary[]> {
  const [all, tree] = await Promise.all([getAllCategories(limit), getCategoryTree()]);
  if (!tree) return all;
  // A child whose parent is gone (merged or hidden) stays visible here.
  const children = new Set([...tree.kids].filter(([parent]) => tree.own.has(parent)).flatMap(([, ids]) => ids));
  return all.filter((c) => !children.has(c.id));
}

export async function getAllCategories(limit = 300): Promise<CategorySummary[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .eq("status", "active")
    .order("reviews_count", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);
  return withTotals((data ?? []) as CategorySummary[], true);
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

/** How a list of reviews is ordered: most liked first by default. */
export const REVIEW_SORTS = ["likes", "stars", "stars_low", "recent"] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export function reviewSortOf(value: unknown): ReviewSort {
  return REVIEW_SORTS.includes(value as ReviewSort) ? (value as ReviewSort) : "likes";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortReviews<Q extends { order: (...args: any[]) => Q }>(query: Q, sort: ReviewSort): Q {
  switch (sort) {
    case "stars":
      return query.order("rating", { ascending: false }).order("likes_count", { ascending: false }).order("created_at", { ascending: false });
    case "stars_low":
      return query.order("rating", { ascending: true }).order("likes_count", { ascending: false }).order("created_at", { ascending: false });
    case "recent":
      return query.order("created_at", { ascending: false });
    default:
      return query.order("likes_count", { ascending: false }).order("rating", { ascending: false }).order("created_at", { ascending: false });
  }
}

export async function getItemReviews(itemId: string, sort: ReviewSort = "likes"): Promise<ReviewRow[]> {
  const supabase = await db();
  if (!supabase) return [];
  const query = supabase
    .from("reviews")
    .select(REVIEW_FIELDS)
    .eq("item_id", itemId)
    .eq("status", "active");
  const { data } = await sortReviews(query, sort).limit(100);
  return withoutBlocked((data ?? []) as unknown as ReviewRow[]);
}

/** All the reviews in a category, with what they are about. */
export async function getCategoryReviews(
  categoryId: string,
  sort: ReviewSort = "likes",
  limit = 50,
): Promise<ReviewRow[]> {
  const supabase = await db();
  if (!supabase) return [];
  const query = supabase
    .from("reviews")
    .select(`${REVIEW_FIELDS}, item:items!inner(name, slug, category_id, category:categories(name, slug, icon, color))`)
    .in("item.category_id", await getCategorySubtreeIds(categoryId))
    .eq("status", "active");
  const { data } = await sortReviews(query, sort).limit(limit);
  return withoutBlocked((data ?? []) as unknown as ReviewRow[]);
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
  const find = (fields: string) =>
    supabase.from("profiles").select(fields).ilike("username", usernamePattern(username)).maybeSingle();
  let { data, error } = await find(PROFILE_FIELDS_BADGE);
  // Database not migrated yet (no `badge` column): read without it.
  if (error?.code === "42703") ({ data, error } = await find(PROFILE_FIELDS));
  return (data as unknown as Profile) ?? null;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await db();
  if (!supabase) return null;
  const find = (fields: string) => supabase.from("profiles").select(fields).eq("id", id).maybeSingle();
  let { data, error } = await find(PROFILE_FIELDS_BADGE);
  if (error?.code === "42703") ({ data, error } = await find(PROFILE_FIELDS));
  return (data as unknown as Profile) ?? null;
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
/** With the like counter (migration 0027). */
const LIST_FIELDS_LIKES = `${LIST_FIELDS}, likes_count`;

type ListQuery = (fields: string) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;

/** Runs a lists query with likes_count, or without it before the migration. */
async function withListLikes(run: ListQuery): Promise<unknown> {
  const first = await run(LIST_FIELDS_LIKES);
  if (first.error?.code === "42703") return (await run(LIST_FIELDS)).data;
  return first.data;
}

export async function getUserLists(userId: string): Promise<ListSummary[]> {
  const supabase = await db();
  if (!supabase) return [];
  const data = await withListLikes((f) =>
    supabase.from("lists").select(f).eq("user_id", userId).order("updated_at", { ascending: false }).limit(200),
  );
  return (data ?? []) as ListSummary[];
}

export async function getRecentLists(limit = 6): Promise<ListSummary[]> {
  const supabase = await db();
  if (!supabase) return [];
  const data = await withListLikes((f) =>
    supabase.from("lists").select(f).gt("items_count", 0).order("updated_at", { ascending: false }).limit(limit),
  );
  return (data ?? []) as ListSummary[];
}

export async function getList(id: string): Promise<ListSummary | null> {
  const supabase = await db();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const data = await withListLikes((f) => supabase.from("lists").select(f).eq("id", id).maybeSingle());
  return (data as ListSummary) ?? null;
}

/** Whether the signed-in user likes this list (false before the migration). */
export async function isListLiked(listId: string, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const supabase = await db();
  if (!supabase) return false;
  const { data } = await supabase
    .from("list_likes")
    .select("list_id")
    .eq("list_id", listId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
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
  offset = 0,
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
    .range(offset, offset + limit - 1);
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
  return withoutBlocked((data ?? []) as unknown as Comment[]);
}

export type Liker = { username: string; display_name: string | null; avatar_url: string | null };

/** People who liked a review, newest first. */
export async function getLikers(reviewId: string, limit = 200): Promise<Liker[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("review_likes")
    .select("created_at, profile:profiles!review_likes_user_id_profiles_id_fk(username, display_name, avatar_url)")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as { profile: Liker | null }[])
    .map((r) => r.profile)
    .filter((p): p is Liker => !!p);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationRow = {
  id: string;
  type: "like" | "comment" | "follow" | "mention" | "watchlist" | "list_like";
  created_at: string;
  read_at: string | null;
  review_id: string | null;
  list_id?: string | null;
  list?: { title: string } | null;
  actor: { username: string; display_name: string | null; avatar_url: string | null } | null;
  review: { item: { name: string } | null } | null;
  comment: { body: string } | null;
};

const NOTIFICATION_FIELDS =
  "id, type, created_at, read_at, review_id, actor:profiles!notifications_actor_id_profiles_id_fk(username, display_name, avatar_url), review:reviews(item:items(name)), comment:review_comments(body)";

/** The signed-in user's notifications, newest first. */
export async function getNotifications(limit = 60): Promise<NotificationRow[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `${NOTIFICATION_FIELDS}, list_id, list:lists(title)`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    // Before migration 0027 there is no list_id.
    const { data: old } = await supabase
      .from("notifications")
      .select(NOTIFICATION_FIELDS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (old ?? []) as unknown as NotificationRow[];
  }
  return (data ?? []) as unknown as NotificationRow[];
}

/** How many unread notifications the signed-in user has (header bell). */
export async function getUnreadCount(): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Global search
// ---------------------------------------------------------------------------

export type SearchItem = ItemSummary & {
  category: { name: string; slug: string; icon: string | null; color: string | null } | null;
};

/** Categories, items and people matching `q` (accents, case and punctuation ignored). */
export async function searchAll(
  q: string,
  limit = 12,
): Promise<{ categories: CategorySummary[]; items: SearchItem[]; people: ProfileCard[] }> {
  const empty = { categories: [], items: [], people: [] };
  const supabase = await db();
  const term = normalizeName(q).slice(0, 60);
  if (!supabase || term.length < 2) return empty;
  const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const [categories, items, people] = await Promise.all([
    supabase
      .from("categories")
      .select(CATEGORY_FIELDS)
      .eq("status", "active")
      .ilike("normalized_name", like)
      .order("reviews_count", { ascending: false })
      .limit(limit),
    supabase
      .from("items")
      .select("id, name, slug, description, reviews_count, avg_rating, category:categories(name, slug, icon, color)")
      .eq("status", "active")
      .ilike("normalized_name", like)
      .order("reviews_count", { ascending: false })
      .limit(limit * 2),
    searchProfiles(q, limit),
  ]);
  const itemRows = (items.data ?? []) as unknown as SearchItem[];
  const covers = await getItemCovers(itemRows.map((i) => i.id));
  return {
    categories: await withTotals((categories.data ?? []) as CategorySummary[]),
    items: itemRows.map((i) => ({ ...i, cover: covers[i.id] ?? null })),
    people: q.trim() ? people : [],
  };
}

export type CategoryFamily = {
  parent: { id: string; name: string; slug: string; icon: string | null; color: string | null } | null;
  children: CategorySummary[];
};

/** The category this one is inside of, and its subcategories (migration 0023). */
export async function getCategoryFamily(categoryId: string): Promise<CategoryFamily> {
  const empty = { parent: null, children: [] };
  const supabase = await db();
  if (!supabase) return empty;
  const [self, kids] = await Promise.all([
    supabase.from("categories").select("parent_id").eq("id", categoryId).maybeSingle(),
    supabase
      .from("categories")
      .select(CATEGORY_FIELDS)
      .eq("parent_id", categoryId)
      .eq("status", "active")
      .order("reviews_count", { ascending: false })
      .order("name", { ascending: true })
      .limit(60),
  ]);
  // Before the migration both fail: no family yet.
  if (self.error || kids.error) return empty;
  const parentId = (self.data as { parent_id: string | null } | null)?.parent_id;
  let parent: CategoryFamily["parent"] = null;
  if (parentId) {
    const { data } = await supabase
      .from("categories")
      .select("id, name, slug, icon, color")
      .eq("id", parentId)
      .eq("status", "active")
      .maybeSingle();
    parent = (data as CategoryFamily["parent"]) ?? null;
  }
  return { parent, children: await withTotals((kids.data ?? []) as CategorySummary[], true) };
}

// ---------------------------------------------------------------------------
// Rating chart, badges, moderation
// ---------------------------------------------------------------------------

/** How many active reviews gave 1…10 (half stars), for an item or a person. */
export async function getRatingCounts(by: { itemId: string } | { userId: string }): Promise<number[]> {
  const counts = Array<number>(10).fill(0);
  const supabase = await db();
  if (!supabase) return counts;
  let query = supabase.from("reviews").select("rating").eq("status", "active");
  query = "itemId" in by ? query.eq("item_id", by.itemId) : query.eq("user_id", by.userId);
  const { data } = await query.limit(5000);
  for (const r of (data ?? []) as { rating: number }[]) {
    if (r.rating >= 1 && r.rating <= 10) counts[r.rating - 1] += 1;
  }
  return counts;
}

export type BadgeKey = "first" | "reviewer" | "pioneer" | "explorer" | "trailblazer";
export type BadgeState = { key: BadgeKey; emoji: string; done: boolean; have: number; need: number };

/** The 5 badges and how far the user is (computed from what they did). */
export async function getBadges(userId: string, reviewsCount: number, foundedCount: number): Promise<BadgeState[]> {
  const supabase = await db();
  let categories = 0;
  let firsts = 0;
  if (supabase && reviewsCount > 0) {
    const { data: mine } = await supabase
      .from("reviews")
      .select("item_id, created_at, item:items(category_id)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1000);
    const rows = (mine ?? []) as unknown as { item_id: string; item: { category_id: string } | null }[];
    categories = new Set(rows.map((r) => r.item?.category_id).filter(Boolean)).size;
    // Apripista: the first review ever written on one of these things is theirs.
    const ids = [...new Set(rows.map((r) => r.item_id))];
    for (let i = 0; i < ids.length && firsts === 0 && i < 600; i += 100) {
      const { data: all } = await supabase
        .from("reviews")
        .select("item_id, user_id, created_at")
        .in("item_id", ids.slice(i, i + 100))
        .order("created_at", { ascending: true })
        .limit(5000);
      const firstBy = new Map<string, string>();
      for (const r of (all ?? []) as { item_id: string; user_id: string }[]) {
        if (!firstBy.has(r.item_id)) firstBy.set(r.item_id, r.user_id);
      }
      firsts = [...firstBy.values()].filter((u) => u === userId).length;
    }
  }
  const badge = (key: BadgeKey, emoji: string, have: number, need: number): BadgeState => ({
    key,
    emoji,
    have: Math.min(have, need),
    need,
    done: have >= need,
  });
  return [
    badge("first", "✍️", reviewsCount, 1),
    badge("reviewer", "📝", reviewsCount, 50),
    badge("pioneer", "🚩", foundedCount, 1),
    badge("explorer", "🧭", categories, 10),
    badge("trailblazer", "🥇", firsts, 1),
  ];
}

/** Founders and moderators (they see and resolve reports). */
export async function isModerator(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const supabase = await db();
  if (!supabase) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  return role === "admin" || role === "moderator";
}

export type ReportRow = {
  id: string;
  target_type: "review" | "comment" | "category" | "item" | "user" | "list";
  target_id: string;
  reason: string;
  created_at: string;
  reporter: { username: string } | null;
};

/** Open reports, newest first (RLS: only moderators get rows). */
export async function getOpenReports(limit = 100): Promise<ReportRow[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, created_at, reporter:profiles!reports_reporter_id_profiles_id_fk(username)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ReportRow[];
}

/** What a report points at, to show it and link to it. */
export async function describeReportTargets(
  rows: ReportRow[],
): Promise<Record<string, { label: string; href: string; excerpt?: string }>> {
  const supabase = await db();
  const out: Record<string, { label: string; href: string; excerpt?: string }> = {};
  if (!supabase || !rows.length) return out;
  const ids = (type: ReportRow["target_type"]) => [...new Set(rows.filter((r) => r.target_type === type).map((r) => r.target_id))];
  const [reviews, comments, categories, items, users, lists] = await Promise.all([
    ids("review").length
      ? supabase.from("reviews").select("id, body, author:profiles!reviews_user_id_profiles_id_fk(username), item:items(name)").in("id", ids("review"))
      : null,
    ids("comment").length
      ? supabase.from("review_comments").select("id, body, review_id, author:profiles!review_comments_user_id_profiles_id_fk(username)").in("id", ids("comment"))
      : null,
    ids("category").length ? supabase.from("categories").select("id, name, slug").in("id", ids("category")) : null,
    ids("item").length ? supabase.from("items").select("id, name, slug, category:categories(slug)").in("id", ids("item")) : null,
    ids("user").length ? supabase.from("profiles").select("id, username").in("id", ids("user")) : null,
    ids("list").length ? supabase.from("lists").select("id, title").in("id", ids("list")) : null,
  ]);
  type Row = Record<string, unknown> & { id: string };
  const rowsOf = (r: { data: unknown } | null) => ((r?.data ?? []) as Row[]);
  for (const r of rowsOf(reviews)) {
    const a = r.author as { username: string } | null;
    const it = r.item as { name: string } | null;
    out[r.id] = { label: `@${a?.username ?? "?"} · ${it?.name ?? ""}`, href: `/r/${r.id}`, excerpt: String(r.body ?? "") };
  }
  for (const r of rowsOf(comments)) {
    const a = r.author as { username: string } | null;
    out[r.id] = { label: `@${a?.username ?? "?"}`, href: `/r/${r.review_id}#comments`, excerpt: String(r.body ?? "") };
  }
  for (const r of rowsOf(categories)) out[r.id] = { label: String(r.name), href: `/c/${r.slug}` };
  for (const r of rowsOf(items)) {
    const c = r.category as { slug: string } | null;
    out[r.id] = { label: String(r.name), href: `/c/${c?.slug ?? ""}/${r.slug}` };
  }
  for (const r of rowsOf(users)) out[r.id] = { label: `@${r.username}`, href: `/u/${r.username}` };
  for (const r of rowsOf(lists)) out[r.id] = { label: String(r.title), href: `/l/${r.id}` };
  return out;
}

/** Whether the signed-in user blocked this person. */
export async function hasBlocked(targetId: string): Promise<boolean> {
  return (await getBlockedIds()).has(targetId);
}
