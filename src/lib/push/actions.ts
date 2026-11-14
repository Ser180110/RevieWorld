"use server";

import { z } from "zod";
import { createClient, getSessionUserId } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(4).max(100) }),
});

/** Remember this phone/browser for push notifications. */
export async function savePushSubscription(sub: unknown): Promise<boolean> {
  const parsed = subscriptionSchema.safeParse(sub);
  if (!parsed.success || !supabaseEnv() || !(await getSessionUserId())) return false;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
  });
  if (error) console.error("savePushSubscription", error);
  return !error;
}

/** Stop push notifications on this phone/browser. */
export async function removePushSubscription(endpoint: string): Promise<void> {
  if (typeof endpoint !== "string" || !supabaseEnv() || !(await getSessionUserId())) return;
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
