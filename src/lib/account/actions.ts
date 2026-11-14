"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { createClient, getSessionUserId } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

export type DeleteAccountState = { error?: "username" | "auth" | "unavailable" | "generic" };

const BUCKETS = ["avatars", "review-photos"];

/**
 * Deletes the signed-in user's account for good: their photos in storage,
 * then (in the database) the user, profile, reviews, comments, likes, lists…
 */
export async function deleteAccount(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const value = String(formData.get("lang") ?? "");
  const lang = hasLocale(value) ? value : defaultLocale;
  const confirm = String(formData.get("confirm_username") ?? "").trim();
  if (!supabaseEnv()) return { error: "generic" };
  const supabase = await createClient();
  const userId = await getSessionUserId();
  if (!userId) return { error: "auth" };

  const { data: me } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  if (!me || me.username.toLowerCase() !== confirm.toLowerCase()) return { error: "username" };

  // Photos first, while we are still signed in (storage only lets owners delete).
  for (const bucket of BUCKETS) {
    try {
      const { data: files } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
      const paths = (files ?? []).map((f) => `${userId}/${f.name}`);
      if (paths.length) await supabase.storage.from(bucket).remove(paths);
    } catch (e) {
      console.error("deleteAccount storage", bucket, e);
    }
  }

  const { data, error } = await supabase.rpc("delete_my_account", { confirm_username: confirm });
  if (error) {
    console.error("deleteAccount", error);
    return { error: error.code === "PGRST202" ? "unavailable" : "generic" };
  }
  if (data !== true) return { error: "username" };

  await supabase.auth.signOut().catch(() => {});
  revalidatePath(`/${lang}`, "layout");
  redirect(`/${lang}?deleted=1`);
}
