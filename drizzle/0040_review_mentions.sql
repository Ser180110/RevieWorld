-- "@username" in a review notifies that person too ("ti ha taggato nella sua
-- recensione"): a 'mention' notification with the review and no comment.
-- On an edit only the newly tagged people are notified.
CREATE OR REPLACE FUNCTION public.notify_review_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.body IS NULL OR NEW.status <> 'active' THEN
    RETURN NULL;
  END IF;
  INSERT INTO notifications (user_id, actor_id, type, review_id)
  SELECT DISTINCT p.id, NEW.user_id, 'mention'::notification_type, NEW.id
    FROM regexp_matches(NEW.body, '(?:^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{3,30})', 'g') AS m(name)
    JOIN profiles p ON lower(p.username) = lower(m.name[1])
   WHERE p.id <> NEW.user_id
     AND NOT EXISTS (
       SELECT 1 FROM notifications n
        WHERE n.type = 'mention' AND n.review_id = NEW.id AND n.comment_id IS NULL AND n.user_id = p.id
     )
   LIMIT 10;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER reviews_mentions AFTER INSERT OR UPDATE OF body ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_review_mentions();
