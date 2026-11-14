import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { previewText } from "@/lib/stickers";

/**
 * Web Push: after someone likes, comments, follows or adds to "Da provare",
 * the notifications they just caused are sent to the phones of the people
 * notified. Needs NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
 */

type Claimed = {
  notification_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  type: "like" | "comment" | "follow" | "mention" | "watchlist";
  review_id: string | null;
  actor: string;
  item: string | null;
  comment: string | null;
};

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function message(n: Claimed): { title: string; body: string; url: string } {
  const who = `@${n.actor}`;
  const what = n.item ? ` «${n.item}»` : "";
  const review = n.review_id ? `/it/r/${n.review_id}` : `/it/u/${n.actor}`;
  switch (n.type) {
    case "like":
      return { title: "❤️ Nuovo mi piace", body: `A ${who} piace la tua recensione di${what || " una cosa"}`, url: `${review}#likes` };
    case "comment":
      return { title: `💬 ${who} ha commentato`, body: previewText(n.comment) || `La tua recensione di${what}`, url: `${review}#comments` };
    case "mention":
      return { title: `📣 ${who} ti ha menzionato`, body: previewText(n.comment) || "In un commento", url: `${review}#comments` };
    case "watchlist":
      return { title: "📌 Da provare", body: `${who} vuole provare${what || " una cosa"} grazie alla tua recensione`, url: review };
    default:
      return { title: "👤 Nuovo follower", body: `${who} ha iniziato a seguirti`, url: `/it/u/${n.actor}` };
  }
}

/** Send what the signed-in user just caused. Never throws. */
export async function sendPendingPushes(supabase: SupabaseClient): Promise<void> {
  if (!pushConfigured()) return;
  try {
    const { data, error } = await supabase.rpc("claim_pushes");
    if (error) {
      // 42883/PGRST202: the database is not migrated yet.
      if (error.code !== "PGRST202" && error.code !== "42883") console.error("claim_pushes", error);
      return;
    }
    const list = (data ?? []) as Claimed[];
    if (list.length === 0) return;
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "https://revie-world.vercel.app",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    await Promise.all(
      list.map(async (n) => {
        const payload = JSON.stringify({ ...message(n), tag: n.notification_id });
        try {
          await webpush.sendNotification(
            { endpoint: n.endpoint, keys: { p256dh: n.p256dh, auth: n.auth } },
            payload,
            { TTL: 60 * 60 * 24, urgency: "high", timeout: 5000 },
          );
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await supabase.rpc("drop_push_subscription", { p_endpoint: n.endpoint });
          } else {
            console.error("push", status ?? e);
          }
        }
      }),
    );
  } catch (e) {
    console.error("sendPendingPushes", e);
  }
}
