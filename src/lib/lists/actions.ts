"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { normalizeName } from "@/lib/normalize";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import type { ItemSearchResult } from "@/lib/data/types";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("lang") ?? "");
  return hasLocale(value) ? value : defaultLocale;
}

async function session() {
  if (!supabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

type Session = NonNullable<Awaited<ReturnType<typeof session>>>;

function safePath(value: FormDataEntryValue | null, fallback: string): string {
  const path = String(value ?? "");
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

const id = z.guid();

/** Appends an item at the end of a list (no-op if it is already there). */
async function append(s: Session, listId: string, itemId: string) {
  const { data: last } = await s.supabase
    .from("list_items")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return s.supabase
    .from("list_items")
    .upsert(
      { list_id: listId, item_id: itemId, position: (last?.position ?? 0) + 1 },
      { ignoreDuplicates: true },
    );
}

// ---------------------------------------------------------------------------
// Create, edit, delete
// ---------------------------------------------------------------------------

export type ListFormState = {
  error?: "title" | "description" | "auth" | "generic";
};

const listSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v === "" ? null : v)),
  ranked: z.boolean(),
});

function parseList(formData: FormData) {
  return listSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    ranked: formData.get("ranked") === "on",
  });
}

function listError(field: PropertyKey | undefined): ListFormState {
  return {
    error: field === "title" || field === "description" ? field : "generic",
  };
}

export async function createList(
  _prev: ListFormState,
  formData: FormData,
): Promise<ListFormState> {
  const lang = localeOf(formData);
  const parsed = parseList(formData);
  if (!parsed.success) return listError(parsed.error.issues[0]?.path[0]);

  const s = await session();
  if (!s) return { error: "generic" };
  if (!s.userId) return { error: "auth" };

  const { data, error } = await s.supabase
    .from("lists")
    .insert({ ...parsed.data, user_id: s.userId })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createList", error);
    return { error: "generic" };
  }
  const itemId = String(formData.get("itemId") ?? "");
  if (id.safeParse(itemId).success) await append(s, data.id, itemId);
  revalidatePath(`/${lang}`, "layout");
  redirect(`/${lang}/l/${data.id}`);
}

export async function updateList(
  _prev: ListFormState,
  formData: FormData,
): Promise<ListFormState> {
  const lang = localeOf(formData);
  const listId = String(formData.get("listId") ?? "");
  const parsed = parseList(formData);
  if (!parsed.success) return listError(parsed.error.issues[0]?.path[0]);
  if (!id.safeParse(listId).success) return { error: "generic" };

  const s = await session();
  if (!s) return { error: "generic" };
  if (!s.userId) return { error: "auth" };

  const { error } = await s.supabase
    .from("lists")
    .update(parsed.data)
    .eq("id", listId)
    .eq("user_id", s.userId);
  if (error) {
    console.error("updateList", error);
    return { error: "generic" };
  }
  revalidatePath(`/${lang}`, "layout");
  redirect(`/${lang}/l/${listId}`);
}

export async function deleteList(formData: FormData): Promise<void> {
  const lang = localeOf(formData);
  const listId = String(formData.get("listId") ?? "");
  const s = await session();
  if (!s) return;
  if (!s.userId) redirect(`/${lang}/login`);
  if (!id.safeParse(listId).success) return;

  const { data: me } = await s.supabase
    .from("profiles")
    .select("username")
    .eq("id", s.userId)
    .maybeSingle();
  await s.supabase
    .from("lists")
    .delete()
    .eq("id", listId)
    .eq("user_id", s.userId);
  revalidatePath(`/${lang}`, "layout");
  redirect(me ? `/${lang}/u/${me.username}/lists` : `/${lang}`);
}

// ---------------------------------------------------------------------------
// Items in a list
// ---------------------------------------------------------------------------

/** Form on the item page: add this item to one of my lists. */
export async function addToList(formData: FormData): Promise<void> {
  const lang = localeOf(formData);
  const listId = String(formData.get("listId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const back = safePath(formData.get("back"), `/${lang}`);
  const s = await session();
  if (!s) return;
  if (!s.userId) redirect(`/${lang}/login`);
  if (!id.safeParse(listId).success || !id.safeParse(itemId).success) return;

  const { error } = await append(s, listId, itemId);
  if (error) console.error("addToList", error);
  revalidatePath(back);
}

/** From the list page search box. */
export async function addItemToList(
  listId: string,
  itemId: string,
): Promise<boolean> {
  const s = await session();
  if (
    !s?.userId ||
    !id.safeParse(listId).success ||
    !id.safeParse(itemId).success
  )
    return false;
  const { error } = await append(s, listId, itemId);
  if (error) console.error("addItemToList", error);
  return !error;
}

export async function removeFromList(formData: FormData): Promise<void> {
  const lang = localeOf(formData);
  const listId = String(formData.get("listId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const s = await session();
  if (
    !s?.userId ||
    !id.safeParse(listId).success ||
    !id.safeParse(itemId).success
  )
    return;
  await s.supabase
    .from("list_items")
    .delete()
    .eq("list_id", listId)
    .eq("item_id", itemId);
  revalidatePath(`/${lang}/l/${listId}`);
}

/** Swaps an item with its neighbour above or below. */
export async function moveInList(formData: FormData): Promise<void> {
  const lang = localeOf(formData);
  const listId = String(formData.get("listId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const up = formData.get("dir") === "up";
  const s = await session();
  if (
    !s?.userId ||
    !id.safeParse(listId).success ||
    !id.safeParse(itemId).success
  )
    return;

  const { data: rows } = await s.supabase
    .from("list_items")
    .select("item_id, position")
    .eq("list_id", listId)
    .order("position", { ascending: true });
  const list = rows ?? [];
  const i = list.findIndex((r) => r.item_id === itemId);
  const j = up ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;

  // Rewrite positions as 1..n with the two entries swapped (also repairs gaps).
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) {
    if (list[k].position !== k + 1) {
      await s.supabase
        .from("list_items")
        .update({ position: k + 1 })
        .eq("list_id", listId)
        .eq("item_id", list[k].item_id);
    }
  }
  revalidatePath(`/${lang}/l/${listId}`);
}

/** Items in any category whose name contains `q`. */
export async function searchItems(q: string): Promise<ItemSearchResult[]> {
  const s = await session();
  const term = normalizeName(q);
  if (!s || term.length < 2) return [];
  const { data } = await s.supabase
    .from("items")
    .select("id, name, category:categories(name)")
    .eq("status", "active")
    .ilike("normalized_name", `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
    .order("reviews_count", { ascending: false })
    .limit(8);
  return (data ?? []) as unknown as ItemSearchResult[];
}
