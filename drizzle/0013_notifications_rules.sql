-- Notifications are written only by these triggers (no INSERT grant):
-- someone likes or comments your review, or starts following you.
-- Undoing a like or a follow removes its notification.

CREATE INDEX notifications_unread_idx ON public.notifications (user_id) WHERE read_at IS NULL;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.notify_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO author FROM reviews WHERE id = NEW.review_id;
    IF author IS NOT NULL AND author <> NEW.user_id THEN
      -- One notification per person and review, even after unlike/like again.
      DELETE FROM notifications
       WHERE type = 'like' AND user_id = author AND actor_id = NEW.user_id AND review_id = NEW.review_id;
      INSERT INTO notifications (user_id, actor_id, type, review_id)
      VALUES (author, NEW.user_id, 'like', NEW.review_id);
    END IF;
  ELSE
    DELETE FROM notifications
     WHERE type = 'like' AND actor_id = OLD.user_id AND review_id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER review_likes_notify AFTER INSERT OR DELETE ON public.review_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_like();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.notify_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  author uuid;
BEGIN
  SELECT user_id INTO author FROM reviews WHERE id = NEW.review_id;
  IF author IS NOT NULL AND author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, review_id, comment_id)
    VALUES (author, NEW.user_id, 'comment', NEW.review_id, NEW.id);
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER review_comments_notify AFTER INSERT ON public.review_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.notify_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    DELETE FROM notifications
     WHERE type = 'follow' AND user_id = NEW.followed_id AND actor_id = NEW.follower_id;
    INSERT INTO notifications (user_id, actor_id, type)
    VALUES (NEW.followed_id, NEW.follower_id, 'follow');
  ELSE
    DELETE FROM notifications
     WHERE type = 'follow' AND user_id = OLD.followed_id AND actor_id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER user_follows_notify AFTER INSERT OR DELETE ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_follow();--> statement-breakpoint

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY notifications_read_own ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY notifications_mark_own ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());--> statement-breakpoint
GRANT SELECT, DELETE ON public.notifications TO authenticated;--> statement-breakpoint
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
