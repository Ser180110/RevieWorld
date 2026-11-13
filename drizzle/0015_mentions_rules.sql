-- "@username" in a comment notifies that person (not the commenter, and not
-- the review author, who already gets the "comment" notification).

CREATE OR REPLACE FUNCTION public.notify_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  author uuid;
BEGIN
  SELECT user_id INTO author FROM reviews WHERE id = NEW.review_id;
  INSERT INTO notifications (user_id, actor_id, type, review_id, comment_id)
  SELECT DISTINCT p.id, NEW.user_id, 'mention'::notification_type, NEW.review_id, NEW.id
    FROM regexp_matches(NEW.body, '@([A-Za-z0-9_]{3,30})', 'g') AS m(name)
    JOIN profiles p ON lower(p.username) = lower(m.name[1])
   WHERE p.id <> NEW.user_id
     AND p.id IS DISTINCT FROM author
   LIMIT 10;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER review_comments_mentions AFTER INSERT ON public.review_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_mentions();
