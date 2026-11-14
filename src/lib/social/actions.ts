"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { joinSticker } from "@/lib/stickers";
import { isThemeKey, patternEmoji } from "@/lib/profileTheme";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { createClient, getSessionUserId } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("lang") ?? "");
  return hasLocale(value) ? value : defaultLocale;
}

async function session() {
  if (!supabaseEnv()) return null;
  const supabase = await createClient();
  return { supabase, userId: await getSessionUserId() };
}

/** Only redirect back to paths inside the app. */
function safePath(value: FormDataEntryValue | null, lang: Locale): string {
  const path = String(value ?? "");
  return path.startsWith("/") && !path.startsWith("//") ? path : `/${lang}`;
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

export type LikeResult = { ok: boolean; liked: boolean; count: number };

export async function setLike(
  reviewId: string,
  like: boolean,
): Promise<LikeResult> {
  const s = await session();
  const fail = { ok: false, liked: !like, count: 0 };
  if (!s?.userId || !z.guid().safeParse(reviewId).success) return fail;

  const { error } = like
    ? await s.supabase
        .from("review_likes")
        .insert({ user_id: s.userId, review_id: reviewId })
    : await s.supabase
        .from("review_likes")
        .delete()
        .eq("user_id", s.userId)
        .eq("review_id", reviewId);
  // 23505 = already liked (double tap, second tab): not an error.
  if (error && error.code !== "23505") {
    console.error("setLike", error);
    return fail;
  }
  // Answer with the real state, counted from the likes themselves.
  const [mine, total] = await Promise.all([
    s.supabase
      .from("review_likes")
      .select("review_id")
      .eq("review_id", reviewId)
      .eq("user_id", s.userId)
      .maybeSingle(),
    s.supabase
      .from("review_likes")
      .select("review_id", { count: "exact", head: true })
      .eq("review_id", reviewId),
  ]);
  return { ok: true, liked: Boolean(mine.data), count: total.count ?? 0 };
}

/** Fresh like state for the reviews on screen (the page itself may be a cached copy). */
export async function getLikeStates(reviewIds: string[]): Promise<Record<string, { liked: boolean; count: number }>> {
  const ids = [...new Set(reviewIds)].filter((id) => z.guid().safeParse(id).success).slice(0, 100);
  if (!ids.length || !supabaseEnv()) return {};
  const supabase = await createClient();
  const userId = await getSessionUserId();
  const [{ data: counts }, { data: mine }] = await Promise.all([
    supabase.from("reviews").select("id, likes_count").in("id", ids),
    userId
      ? supabase.from("review_likes").select("review_id").eq("user_id", userId).in("review_id", ids)
      : Promise.resolve({ data: [] as { review_id: string }[] }),
  ]);
  const liked = new Set((mine ?? []).map((r) => r.review_id as string));
  return Object.fromEntries(
    (counts ?? []).map((r) => [r.id as string, { liked: liked.has(r.id as string), count: r.likes_count as number }]),
  );
}

// ---------------------------------------------------------------------------
// Following people
// ---------------------------------------------------------------------------

export async function setUserFollow(formData: FormData): Promise<void> {
  const lang = localeOf(formData);
  const userId = String(formData.get("userId") ?? "");
  const username = String(formData.get("username") ?? "");
  const follow = formData.get("follow") === "1";

  const s = await session();
  if (!s) return;
  if (!s.userId) redirect(`/${lang}/login`);
  if (s.userId === userId || !z.guid().safeParse(userId).success) return;

  if (follow) {
    await s.supabase
      .from("user_follows")
      .upsert(
        { follower_id: s.userId, followed_id: userId },
        { ignoreDuplicates: true },
      );
  } else {
    await s.supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", s.userId)
      .eq("followed_id", userId);
  }
  revalidatePath(`/${lang}/u/${username}`, "layout");
  const back = formData.get("back");
  if (back) revalidatePath(safePath(back, lang));
}

// ---------------------------------------------------------------------------
// Deleting a review
// ---------------------------------------------------------------------------

export async function deleteReview(formData: FormData): Promise<void> {
  const lang = localeOf(formData);
  const reviewId = String(formData.get("reviewId") ?? "");
  const back = safePath(formData.get("back"), lang);

  const s = await session();
  if (!s) return;
  if (!s.userId) redirect(`/${lang}/login`);
  if (!z.guid().safeParse(reviewId).success) return;

  const { error } = await s.supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", s.userId);
  if (error) console.error("deleteReview", error);
  revalidatePath(`/${lang}`, "layout");
  redirect(back);
}

// ---------------------------------------------------------------------------
// Editing the profile
// ---------------------------------------------------------------------------

export type ProfileFormState = {
  error?:
    | "username"
    | "username_taken"
    | "display_name"
    | "bio"
    | "location"
    | "website"
    | "auth"
    | "generic";
};

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,30}$/),
  display_name: optional(60),
  bio: optional(500),
  location: optional(80),
  website: optional(200)
    .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
    .pipe(z.url({ protocol: /^https?$/ }).nullable()),
  avatar_url: optional(500).pipe(z.url({ protocol: /^https?$/ }).nullable()),
});

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const lang = localeOf(formData);
  const parsed = profileSchema.safeParse({
    username: formData.get("username") ?? "",
    display_name: formData.get("display_name") ?? "",
    bio: formData.get("bio") ?? "",
    location: formData.get("location") ?? "",
    website: formData.get("website") ?? "",
    avatar_url: formData.get("avatar_url") ?? "",
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    switch (field) {
      case "username":
      case "display_name":
      case "bio":
      case "location":
      case "website":
        return { error: field };
      default:
        return { error: "generic" };
    }
  }
  const input = parsed.data;

  const s = await session();
  if (!s) return { error: "generic" };
  if (!s.userId) return { error: "auth" };

  const { data: taken } = await s.supabase
    .from("profiles")
    .select("id")
    .ilike(
      "username",
      input.username.replace(/[\\%_]/g, (c) => `\\${c}`),
    )
    .neq("id", s.userId)
    .maybeSingle();
  if (taken) return { error: "username_taken" };

  const themeBg = String(formData.get("theme_bg") ?? "");
  const themeEmoji = String(formData.get("theme_emoji") ?? "");
  const look = {
    theme_bg: isThemeKey(themeBg) && themeBg !== "default" ? themeBg : null,
    theme_emoji: patternEmoji(themeEmoji),
  };
  let { error } = await s.supabase
    .from("profiles")
    .update({ ...input, ...look })
    .eq("id", s.userId);
  // Database not migrated yet (no theme columns): save the rest.
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    ({ error } = await s.supabase.from("profiles").update(input).eq("id", s.userId));
  }
  if (error) {
    if (error.code === "23505") return { error: "username_taken" };
    console.error("updateProfile", error);
    return { error: "generic" };
  }
  revalidatePath(`/${lang}`, "layout");
  redirect(`/${lang}/u/${input.username}`);
}

// ---------------------------------------------------------------------------
// Favourites (max 4) and "Da provare"
// ---------------------------------------------------------------------------

export async function setFavorite(formData: FormData): Promise<void> {
  const lang = localeOf(formData);
  const itemId = String(formData.get("itemId") ?? "");
  const on = formData.get("on") === "1";
  const back = safePath(formData.get("back"), lang);
  const s = await session();
  if (!s) return;
  if (!s.userId) redirect(`/${lang}/login`);
  if (!z.guid().safeParse(itemId).success) return;

  if (on) {
    const { data } = await s.supabase.from("profile_favorites").select("item_id, position").eq("user_id", s.userId);
    const rows = data ?? [];
    if (rows.some((r) => r.item_id === itemId)) return;
    const free = [1, 2, 3, 4].find((n) => !rows.some((r) => r.position === n));
    if (!free) return;
    const { error } = await s.supabase
      .from("profile_favorites")
      .insert({ user_id: s.userId, item_id: itemId, position: free });
    if (error) console.error("setFavorite", error);
  } else {
    await s.supabase.from("profile_favorites").delete().eq("user_id", s.userId).eq("item_id", itemId);
  }
  revalidatePath(back);
  revalidatePath(`/${lang}/u`, "layout");
}

export async function setWatchlist(formData: FormData): Promise<void> {
  const lang = localeOf(formData);
  const itemId = String(formData.get("itemId") ?? "");
  const on = formData.get("on") === "1";
  const back = safePath(formData.get("back"), lang);
  const s = await session();
  if (!s) return;
  if (!s.userId) redirect(`/${lang}/login`);
  if (!z.guid().safeParse(itemId).success) return;

  if (on) {
    await s.supabase.from("watchlist").upsert({ user_id: s.userId, item_id: itemId }, { ignoreDuplicates: true });
  } else {
    await s.supabase.from("watchlist").delete().eq("user_id", s.userId).eq("item_id", itemId);
  }
  revalidatePath(back);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export type CommentFormState = { error?: "body" | "auth" | "generic"; ok?: number };

export async function addComment(_prev: CommentFormState, formData: FormData): Promise<CommentFormState> {
  const lang = localeOf(formData);
  const reviewId = String(formData.get("reviewId") ?? "");
  const text = z.string().trim().max(960).safeParse(formData.get("body") ?? "");
  if (!text.success) return { error: "body" };
  // A comment can be just a sticker.
  const body = { data: joinSticker(text.data, String(formData.get("sticker") ?? "")) };
  if (!body.data) return { error: "body" };
  if (!z.guid().safeParse(reviewId).success) return { error: "generic" };
  const s = await session();
  if (!s) return { error: "generic" };
  if (!s.userId) return { error: "auth" };

  const { error } = await s.supabase
    .from("review_comments")
    .insert({ review_id: reviewId, user_id: s.userId, body: body.data });
  if (error) {
    console.error("addComment", error);
    return { error: "generic" };
  }
  revalidatePath(`/${lang}/r/${reviewId}`);
  return { ok: Date.now() };
}

export async function deleteComment(formData: FormData): Promise<void> {
  const lang = localeOf(formData);
  const commentId = String(formData.get("commentId") ?? "");
  const reviewId = String(formData.get("reviewId") ?? "");
  const s = await session();
  if (!s?.userId || !z.guid().safeParse(commentId).success) return;
  // RLS allows the comment's author and the review's author.
  await s.supabase.from("review_comments").delete().eq("id", commentId);
  revalidatePath(`/${lang}/r/${reviewId}`);
}

/** Marks all the signed-in user's notifications as read. */
export async function markNotificationsRead(): Promise<void> {
  if (!supabaseEnv()) return;
  const userId = await getSessionUserId();
  if (!userId) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

export type MentionSuggestion = { username: string; display_name: string | null; avatar_url: string | null };

/** People whose username starts with `q`, for "@" autocomplete in comments. */
export async function suggestMentions(q: string): Promise<MentionSuggestion[]> {
  const term = q.replace(/[^A-Za-z0-9_]/g, "").slice(0, 30);
  if (!term || !supabaseEnv()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .ilike("username", `${term.replace(/_/g, "\\_")}%`)
    .order("username")
    .limit(5);
  return (data ?? []) as MentionSuggestion[];
}
