"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getSessionUserId } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { REPORT_REASONS, REPORT_TARGETS, type ReportTarget } from "./reasons";


export type ReportState = { ok?: boolean; error?: "auth" | "unavailable" | "generic" };

/** "🚩 Segnala": goes to the founders' reports page. */
export async function reportContent(_prev: ReportState, formData: FormData): Promise<ReportState> {
  if (!supabaseEnv()) return { error: "generic" };
  const targetType = String(formData.get("targetType") ?? "") as ReportTarget;
  const targetId = String(formData.get("targetId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!REPORT_TARGETS.includes(targetType) || !z.guid().safeParse(targetId).success) return { error: "generic" };
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return { error: "generic" };

  const supabase = await createClient();
  const userId = await getSessionUserId();
  if (!userId) return { error: "auth" };
  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    target_type: targetType,
    target_id: targetId,
    reason: note ? `${reason}: ${note}` : reason,
  });
  if (error) {
    console.error("reportContent", error);
    // 22P02: "comment"/"list" not in the enum yet (database not migrated).
    return { error: error.code === "22P02" ? "unavailable" : "generic" };
  }
  return { ok: true };
}

/** Block or unblock someone. */
export async function setBlock(formData: FormData): Promise<void> {
  if (!supabaseEnv()) return;
  const targetId = String(formData.get("userId") ?? "");
  const block = formData.get("block") === "1";
  const path = String(formData.get("path") ?? "");
  if (!z.guid().safeParse(targetId).success) return;
  const supabase = await createClient();
  const userId = await getSessionUserId();
  if (!userId || userId === targetId) return;
  const { error } = block
    ? await supabase.from("user_blocks").upsert({ blocker_id: userId, blocked_id: targetId }, { ignoreDuplicates: true })
    : await supabase.from("user_blocks").delete().eq("blocker_id", userId).eq("blocked_id", targetId);
  if (error) console.error("setBlock", error);
  revalidatePath(path.startsWith("/") ? path : "/", "layout");
}

/** Founders: hide the reported thing, or keep it. */
export async function resolveReport(formData: FormData): Promise<void> {
  if (!supabaseEnv()) return;
  const reportId = String(formData.get("reportId") ?? "");
  const action = String(formData.get("action") ?? "");
  const lang = String(formData.get("lang") ?? "it");
  if (!z.guid().safeParse(reportId).success || !["hide", "dismiss"].includes(action)) return;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_report", { report: reportId, action });
  if (error || data !== "ok") console.error("resolveReport", error ?? data);
  revalidatePath(`/${lang}`, "layout");
}
