-- 1. "Da provare": when someone adds a thing to their list, the people who
--    reviewed it are told (once per person and thing, even after re-adding).
CREATE OR REPLACE FUNCTION public.notify_watchlist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM notifications n
   USING reviews r
   WHERE n.type = 'watchlist' AND n.actor_id = NEW.user_id
     AND n.review_id = r.id AND r.item_id = NEW.item_id;
  INSERT INTO notifications (user_id, actor_id, type, review_id)
  SELECT r.user_id, NEW.user_id, 'watchlist'::notification_type, r.id
    FROM reviews r
   WHERE r.item_id = NEW.item_id AND r.status = 'active' AND r.user_id <> NEW.user_id
   ORDER BY r.created_at
   LIMIT 50;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER watchlist_notify AFTER INSERT ON public.watchlist
  FOR EACH ROW EXECUTE FUNCTION public.notify_watchlist();--> statement-breakpoint

-- 2. Push subscriptions: saved and removed by their owner only.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());--> statement-breakpoint
GRANT DELETE ON public.push_subscriptions TO authenticated;--> statement-breakpoint

-- Save this device for the signed-in user (a shared phone moves to whoever
-- signed in last).
CREATE OR REPLACE FUNCTION public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
  SELECT auth.uid(), p_endpoint, p_p256dh, p_auth
   WHERE auth.uid() IS NOT NULL
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.save_push_subscription(text, text, text) FROM public, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text, text, text) TO authenticated;--> statement-breakpoint

-- 3. After a like, comment, follow or "Da provare", the server (acting as
--    that user) takes the new notifications they caused and the devices of
--    the people to notify. Each notification is handed out only once.
CREATE OR REPLACE FUNCTION public.claim_pushes()
RETURNS TABLE (
  notification_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  type notification_type,
  review_id uuid,
  actor text,
  item text,
  comment text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH claimed AS (
    UPDATE notifications n
       SET pushed_at = now()
     WHERE n.actor_id = auth.uid()
       AND n.pushed_at IS NULL
       AND n.read_at IS NULL
       AND n.created_at > now() - interval '5 minutes'
    RETURNING n.id, n.user_id, n.actor_id, n.type, n.review_id, n.comment_id
  )
  SELECT c.id, s.endpoint, s.p256dh, s.auth, c.type, c.review_id, p.username, i.name, left(rc.body, 300)
    FROM claimed c
    JOIN push_subscriptions s ON s.user_id = c.user_id
    JOIN profiles p ON p.id = c.actor_id
    LEFT JOIN reviews r ON r.id = c.review_id
    LEFT JOIN items i ON i.id = r.item_id
    LEFT JOIN review_comments rc ON rc.id = c.comment_id;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.claim_pushes() FROM public, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.claim_pushes() TO authenticated;--> statement-breakpoint

-- A device that no longer exists (the push service said "gone"): only for
-- someone the caller has just notified.
CREATE OR REPLACE FUNCTION public.drop_push_subscription(p_endpoint text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM push_subscriptions s
   WHERE s.endpoint = p_endpoint
     AND EXISTS (
       SELECT 1 FROM notifications n
        WHERE n.user_id = s.user_id AND n.actor_id = auth.uid()
          AND n.pushed_at > now() - interval '10 minutes'
     );
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.drop_push_subscription(text) FROM public, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.drop_push_subscription(text) TO authenticated;
