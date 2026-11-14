"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { normalizeName, slugify } from "@/lib/normalize";
import { guessColor, guessEmoji, isColor } from "@/lib/categoryStyle";
import { createClient, getSessionUserId } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import type { Suggestion } from "@/lib/data/types";
import { isOwnPhotoPath, MAX_REVIEW_PHOTOS } from "@/lib/photos";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type FormState = {
  error?: "auth" | "category" | "item" | "rating" | "generic";
};

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("lang") ?? "");
  return hasLocale(value) ? value : defaultLocale;
}

async function client(): Promise<SupabaseClient | null> {
  return supabaseEnv() ? createClient() : null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function currentUserId(_supabase: SupabaseClient): Promise<string | null> {
  return getSessionUserId();
}

/** First free slug in `table` (scoped to a category for items). */
async function uniqueSlug(
  supabase: SupabaseClient,
  table: "categories" | "items",
  name: string,
  categoryId?: string,
): Promise<string> {
  const base =
    slugify(name) ||
    `${table === "items" ? "i" : "c"}-${Date.now().toString(36)}`;
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    let query = supabase.from(table).select("id").eq("slug", candidate);
    if (categoryId) query = query.eq("category_id", categoryId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// Suggestions while typing (duplicate prevention)
// ---------------------------------------------------------------------------

export async function suggestCategories(q: string): Promise<Suggestion[]> {
  const supabase = await client();
  const query = normalizeName(q);
  if (!supabase || query.length < 2) return [];
  const { data } = await supabase.rpc("suggest_categories", {
    q: query,
    max_results: 6,
  });
  return (data ?? []) as Suggestion[];
}

export async function suggestItems(
  categoryId: string,
  q: string,
): Promise<Suggestion[]> {
  const supabase = await client();
  const query = normalizeName(q);
  if (!supabase || query.length < 2) return [];
  const { data } = await supabase.rpc("suggest_items", {
    cat: categoryId,
    q: query,
    max_results: 5,
  });
  return (data ?? []) as Suggestion[];
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categoryName = z.string().trim().min(2).max(60);

/** A short emoji typed or picked by the user, or null. */
function chosenIcon(value: FormDataEntryValue | null): string | null {
  const icon = String(value ?? "").trim();
  if (!icon || [...icon].length > 4 || icon.length > 16 || /[\p{L}\p{N}<>]/u.test(icon)) return null;
  return icon;
}

export async function createCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const lang = localeOf(formData);
  const parsed = categoryName.safeParse(formData.get("name"));
  if (!parsed.success) return { error: "category" };
  const name = parsed.data;
  const normalized = normalizeName(name);
  if (normalized.length < 2) return { error: "category" };

  const supabase = await client();
  if (!supabase) return { error: "generic" };
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "auth" };

  // Same name after normalization ("Tombini!" = "tombini"): join the existing one.
  const { data: existing } = await supabase
    .from("categories")
    .select("slug")
    .eq("normalized_name", normalized)
    .maybeSingle();
  if (existing) redirect(`/${lang}/c/${existing.slug}`);

  const slug = await uniqueSlug(supabase, "categories", name);
  const { error } = await supabase
    .from("categories")
    .insert({
      name,
      slug,
      normalized_name: normalized,
      created_by: userId,
      icon: chosenIcon(formData.get("icon")) ?? guessEmoji(normalized),
      color: guessColor(normalized),
    });

  if (error) {
    if (error.code === "23505") {
      const { data: race } = await supabase
        .from("categories")
        .select("slug")
        .eq("normalized_name", normalized)
        .maybeSingle();
      if (race) redirect(`/${lang}/c/${race.slug}`);
    }
    console.error("createCategory", error);
    return { error: "generic" };
  }
  redirect(`/${lang}/c/${slug}`);
}

export async function setFollow(formData: FormData): Promise<void> {
  const lang = localeOf(formData);
  const categoryId = String(formData.get("categoryId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const follow = formData.get("follow") === "1";

  const supabase = await client();
  if (!supabase) return;
  const userId = await currentUserId(supabase);
  if (!userId) redirect(`/${lang}/login`);

  if (follow) {
    await supabase
      .from("category_follows")
      .upsert(
        { user_id: userId, category_id: categoryId },
        { ignoreDuplicates: true },
      );
  } else {
    await supabase
      .from("category_follows")
      .delete()
      .eq("user_id", userId)
      .eq("category_id", categoryId);
  }
  revalidatePath(`/${lang}/c/${slug}`);
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

const reviewSchema = z.object({
  categoryId: z.uuid(),
  categorySlug: z.string().min(1),
  itemId: z.uuid().optional(),
  itemName: z.string().trim().min(2).max(120).optional(),
  rating: z.coerce.number().int().min(1).max(10),
  body: z.string().trim().max(5000).optional(),
  spoiler: z.boolean(),
});

export async function submitReview(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const lang = localeOf(formData);
  const raw = {
    categoryId: formData.get("categoryId"),
    categorySlug: formData.get("categorySlug"),
    itemId: formData.get("itemId") || undefined,
    itemName: formData.get("itemName") || undefined,
    rating: formData.get("rating"),
    body: formData.get("body") || undefined,
    spoiler: formData.get("spoiler") === "on",
  };
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "rating") return { error: "rating" };
    if (field === "itemName") return { error: "item" };
    return { error: "generic" };
  }
  const input = parsed.data;
  if (!input.itemId && !input.itemName) return { error: "item" };

  const supabase = await client();
  if (!supabase) return { error: "generic" };
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "auth" };

  // 1. Find or create the item.
  let item: { id: string; slug: string } | null = null;
  if (input.itemId) {
    const { data } = await supabase
      .from("items")
      .select("id, slug")
      .eq("id", input.itemId)
      .eq("category_id", input.categoryId)
      .maybeSingle();
    item = data;
  } else if (input.itemName) {
    const normalized = normalizeName(input.itemName);
    if (normalized.length < 2) return { error: "item" };
    const { data: existing } = await supabase
      .from("items")
      .select("id, slug")
      .eq("category_id", input.categoryId)
      .eq("normalized_name", normalized)
      .maybeSingle();
    item = existing;
    if (!item) {
      const slug = await uniqueSlug(
        supabase,
        "items",
        input.itemName,
        input.categoryId,
      );
      const { data: created, error } = await supabase
        .from("items")
        .insert({
          category_id: input.categoryId,
          name: input.itemName,
          slug,
          normalized_name: normalized,
          created_by: userId,
        })
        .select("id, slug")
        .single();
      if (error) {
        console.error("submitReview: create item", error);
        return { error: "generic" };
      }
      item = created;
    }
  }
  if (!item) return { error: "item" };

  // 2. One review per user and item: update it if it exists.
  const fields = {
    rating: input.rating,
    body: input.body ?? null,
    contains_spoiler: input.spoiler,
  };
  const { data: mine } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", item.id)
    .maybeSingle();

  const { data: saved, error } = mine
    ? await supabase.from("reviews").update(fields).eq("id", mine.id).select("id").single()
    : await supabase
        .from("reviews")
        .insert({ ...fields, user_id: userId, item_id: item.id })
        .select("id")
        .single();
  if (error || !saved) {
    console.error("submitReview: save review", error);
    return { error: "generic" };
  }

  // 3. Photos: drop the removed ones, attach the new uploads (max 4 per review).
  const removeIds = formData
    .getAll("removePhoto")
    .map(String)
    .filter((v) => z.guid().safeParse(v).success);
  if (removeIds.length) {
    const { data: gone } = await supabase
      .from("review_photos")
      .delete()
      .eq("review_id", saved.id)
      .in("id", removeIds)
      .select("storage_path");
    const paths = (gone ?? []).map((g) => g.storage_path as string);
    if (paths.length) await supabase.storage.from("review-photos").remove(paths);
  }
  const newPaths = [...new Set(formData.getAll("photo").map(String))].filter((p) => isOwnPhotoPath(p, userId));
  if (newPaths.length) {
    const { data: current } = await supabase.from("review_photos").select("position").eq("review_id", saved.id);
    const used = new Set((current ?? []).map((c) => c.position as number));
    const free = [0, 1, 2, 3].filter((n) => !used.has(n)).slice(0, MAX_REVIEW_PHOTOS);
    const rows = newPaths
      .slice(0, free.length)
      .map((storage_path, i) => ({ review_id: saved.id, storage_path, position: free[i] }));
    if (rows.length) {
      const { error: photoError } = await supabase.from("review_photos").insert(rows);
      if (photoError) console.error("submitReview: photos", photoError);
    }
  }

  // Writing in a category means joining it.
  await supabase
    .from("category_follows")
    .upsert(
      { user_id: userId, category_id: input.categoryId },
      { ignoreDuplicates: true },
    );

  revalidatePath(`/${lang}`, "layout");
  const back = String(formData.get("back") ?? "");
  redirect(
    back.startsWith(`/${lang}/`) && !back.startsWith("//")
      ? back
      : `/${lang}/c/${input.categorySlug}/${item.slug}`,
  );
}

// ---------------------------------------------------------------------------
// Category look (creator only, enforced by the set_category_style function)
// ---------------------------------------------------------------------------

export async function setCategoryStyle(_prev: { error?: boolean }, formData: FormData): Promise<{ error?: boolean }> {
  const lang = localeOf(formData);
  const categoryId = String(formData.get("categoryId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const icon = String(formData.get("icon") ?? "").trim();
  const color = String(formData.get("color") ?? "");
  if (!z.guid().safeParse(categoryId).success || !isColor(color) || [...icon].length > 4 || icon.length > 16) {
    return { error: true };
  }
  const supabase = await client();
  if (!supabase) return { error: true };
  const { data, error } = await supabase.rpc("set_category_style", {
    cat: categoryId,
    new_icon: icon,
    new_color: color,
  });
  if (error || !data) {
    if (error) console.error("setCategoryStyle", error);
    return { error: true };
  }
  revalidatePath(`/${lang}`, "layout");
  redirect(`/${lang}/c/${slug}`);
}

// ---------------------------------------------------------------------------
// Rename a category (creator, while nobody else has reviewed in it)
// ---------------------------------------------------------------------------

export type RenameState = { error?: "name" | "forbidden" | "locked" | "duplicate" | "generic" };

export async function renameCategory(_prev: RenameState, formData: FormData): Promise<RenameState> {
  const lang = localeOf(formData);
  const categoryId = String(formData.get("categoryId") ?? "");
  const currentSlug = String(formData.get("slug") ?? "");
  const parsed = categoryName.safeParse(formData.get("name"));
  if (!parsed.success || !z.guid().safeParse(categoryId).success) return { error: "name" };
  const name = parsed.data;
  const normalized = normalizeName(name);
  if (normalized.length < 2) return { error: "name" };

  const supabase = await client();
  if (!supabase) return { error: "generic" };
  const wanted = slugify(name);
  const slug = wanted && wanted === currentSlug ? currentSlug : await uniqueSlug(supabase, "categories", name);
  const { data, error } = await supabase.rpc("rename_category", {
    cat: categoryId,
    new_name: name,
    new_normalized: normalized,
    new_slug: slug,
  });
  if (error) {
    console.error("renameCategory", error);
    return { error: "generic" };
  }
  if (data !== "ok") return { error: (data as RenameState["error"]) ?? "generic" };
  revalidatePath(`/${lang}`, "layout");
  redirect(`/${lang}/c/${slug}`);
}
