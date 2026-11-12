"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { normalizeName, slugify } from "@/lib/normalize";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import type { Suggestion } from "@/lib/data/types";

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

async function currentUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** First free slug in `table` (scoped to a category for items). */
async function uniqueSlug(
  supabase: SupabaseClient,
  table: "categories" | "items",
  name: string,
  categoryId?: string,
): Promise<string> {
  const base = slugify(name) || `${table === "items" ? "i" : "c"}-${Date.now().toString(36)}`;
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
  const { data } = await supabase.rpc("suggest_categories", { q: query, max_results: 6 });
  return (data ?? []) as Suggestion[];
}

export async function suggestItems(categoryId: string, q: string): Promise<Suggestion[]> {
  const supabase = await client();
  const query = normalizeName(q);
  if (!supabase || query.length < 2) return [];
  const { data } = await supabase.rpc("suggest_items", { cat: categoryId, q: query, max_results: 5 });
  return (data ?? []) as Suggestion[];
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categoryName = z.string().trim().min(2).max(60);

export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
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
    .insert({ name, slug, normalized_name: normalized, created_by: userId });

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
      .upsert({ user_id: userId, category_id: categoryId }, { ignoreDuplicates: true });
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

export async function submitReview(_prev: FormState, formData: FormData): Promise<FormState> {
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
      const slug = await uniqueSlug(supabase, "items", input.itemName, input.categoryId);
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

  const { error } = mine
    ? await supabase.from("reviews").update(fields).eq("id", mine.id)
    : await supabase.from("reviews").insert({ ...fields, user_id: userId, item_id: item.id });
  if (error) {
    console.error("submitReview: save review", error);
    return { error: "generic" };
  }

  // Writing in a category means joining it.
  await supabase
    .from("category_follows")
    .upsert({ user_id: userId, category_id: input.categoryId }, { ignoreDuplicates: true });

  revalidatePath(`/${lang}`, "layout");
  redirect(`/${lang}/c/${input.categorySlug}/${item.slug}`);
}
