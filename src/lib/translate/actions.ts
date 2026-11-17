"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { splitSticker } from "@/lib/stickers";
import { detectLang, type SiteLang } from "./detect";
import { translateWithMyMemory } from "./mymemory";

export type TranslateResult = { text: string } | { fallback: string };

/** Google Translate in a new tab: always free, the last resort. */
function googleUrl(text: string, from: string, to: string): string {
  return `https://translate.google.com/?sl=${from}&tl=${to}&op=translate&text=${encodeURIComponent(text.slice(0, 3000))}`;
}

/** "🌐 Traduci" on a review: its text in `to` ("it" or "en"). */
export async function translateReview(reviewId: string, to: SiteLang): Promise<TranslateResult | null> {
  if (!z.guid().safeParse(reviewId).success || (to !== "it" && to !== "en") || !supabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("reviews").select("body").eq("id", reviewId).maybeSingle();
  const text = splitSticker((data as { body: string | null } | null)?.body).text.trim();
  if (!text) return null;
  const from = detectLang(text) ?? (to === "it" ? "en" : "it");
  if (from === to) return { text };
  try {
    return { text: await translateWithMyMemory(text, from, to) };
  } catch (e) {
    console.error("translateReview", e);
    return { fallback: googleUrl(text, from, to) };
  }
}
