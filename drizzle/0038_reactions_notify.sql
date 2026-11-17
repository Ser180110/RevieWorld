-- "@anna ha reagito 😂 al tuo commento": a notification (and push) to the
-- comment's author. Changing the emoji replaces it; removing it deletes it.
CREATE OR REPLACE FUNCTION public.notify_comment_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner uuid;
  rev uuid;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    DELETE FROM notifications
     WHERE type = 'comment_reaction' AND actor_id = OLD.user_id AND comment_id = OLD.comment_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT user_id, review_id INTO owner, rev FROM review_comments WHERE id = NEW.comment_id;
    IF owner IS NOT NULL AND owner <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, review_id, comment_id, emoji)
      VALUES (owner, NEW.user_id, 'comment_reaction', rev, NEW.comment_id, NEW.emoji);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER comment_reactions_notify AFTER INSERT OR DELETE OR UPDATE OF emoji ON public.comment_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment_reaction();--> statement-breakpoint

-- Pushes now also carry the reaction's emoji (new column, so drop and recreate).
DROP FUNCTION IF EXISTS public.claim_pushes();--> statement-breakpoint
CREATE FUNCTION public.claim_pushes()
RETURNS TABLE (
  notification_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  type notification_type,
  review_id uuid,
  actor text,
  item text,
  comment text,
  emoji text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH claimed AS (
    UPDATE notifications n
       SET pushed_at = now()
     WHERE n.actor_id = auth.uid()
       AND n.pushed_at IS NULL
       AND n.read_at IS NULL
       AND n.created_at > now() - interval '5 minutes'
    RETURNING n.id, n.user_id, n.actor_id, n.type, n.review_id, n.comment_id, n.emoji
  )
  SELECT c.id, s.endpoint, s.p256dh, s.auth, c.type, c.review_id, p.username, i.name, left(rc.body, 300), c.emoji
    FROM claimed c
    JOIN push_subscriptions s ON s.user_id = c.user_id
    JOIN profiles p ON p.id = c.actor_id
    LEFT JOIN reviews r ON r.id = c.review_id
    LEFT JOIN items i ON i.id = r.item_id
    LEFT JOIN review_comments rc ON rc.id = c.comment_id;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.claim_pushes() FROM public, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.claim_pushes() TO authenticated;
