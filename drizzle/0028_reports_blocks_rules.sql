-- Founders (Fondatore / Ideatrice) moderate: they read reports and hide content.
UPDATE public.profiles SET role = 'admin' WHERE badge IN ('founder', 'ideator') AND role = 'user';--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Blocks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_blocked(blocker uuid, blocked uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_blocks WHERE blocker_id = blocker AND blocked_id = blocked);
$$;--> statement-breakpoint

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY user_blocks_read_own ON public.user_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());--> statement-breakpoint
CREATE POLICY user_blocks_insert_own ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());--> statement-breakpoint
CREATE POLICY user_blocks_delete_own ON public.user_blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;--> statement-breakpoint

-- Blocking someone also removes the follows between the two of you.
CREATE OR REPLACE FUNCTION public.block_cleanup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM user_follows
   WHERE (follower_id = NEW.blocker_id AND followed_id = NEW.blocked_id)
      OR (follower_id = NEW.blocked_id AND followed_id = NEW.blocker_id);
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER user_blocks_cleanup AFTER INSERT ON public.user_blocks
  FOR EACH ROW EXECUTE FUNCTION public.block_cleanup();--> statement-breakpoint

-- A blocked person cannot follow, comment on, or like the blocker's things.
CREATE OR REPLACE FUNCTION public.forbid_blocked()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner uuid;
  actor uuid;
BEGIN
  IF TG_TABLE_NAME = 'user_follows' THEN
    owner := NEW.followed_id; actor := NEW.follower_id;
  ELSIF TG_TABLE_NAME = 'review_comments' THEN
    SELECT user_id INTO owner FROM reviews WHERE id = NEW.review_id; actor := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'review_likes' THEN
    SELECT user_id INTO owner FROM reviews WHERE id = NEW.review_id; actor := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'list_likes' THEN
    SELECT user_id INTO owner FROM lists WHERE id = NEW.list_id; actor := NEW.user_id;
  END IF;
  IF owner IS NOT NULL AND public.is_blocked(owner, actor) THEN
    RAISE EXCEPTION 'blocked' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER user_follows_not_blocked BEFORE INSERT ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.forbid_blocked();--> statement-breakpoint
CREATE TRIGGER review_comments_not_blocked BEFORE INSERT ON public.review_comments
  FOR EACH ROW EXECUTE FUNCTION public.forbid_blocked();--> statement-breakpoint
CREATE TRIGGER review_likes_not_blocked BEFORE INSERT ON public.review_likes
  FOR EACH ROW EXECUTE FUNCTION public.forbid_blocked();--> statement-breakpoint
CREATE TRIGGER list_likes_not_blocked BEFORE INSERT ON public.list_likes
  FOR EACH ROW EXECUTE FUNCTION public.forbid_blocked();--> statement-breakpoint

-- No notifications (mentions included) from someone you blocked.
CREATE OR REPLACE FUNCTION public.skip_blocked_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_blocked(NEW.user_id, NEW.actor_id) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER notifications_not_blocked BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.skip_blocked_notification();--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Likes on lists
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_list_likes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lists SET likes_count = likes_count + 1 WHERE id = NEW.list_id RETURNING user_id INTO owner;
    IF owner IS NOT NULL AND owner <> NEW.user_id THEN
      DELETE FROM notifications WHERE type = 'list_like' AND actor_id = NEW.user_id AND list_id = NEW.list_id;
      INSERT INTO notifications (user_id, actor_id, type, list_id) VALUES (owner, NEW.user_id, 'list_like', NEW.list_id);
    END IF;
  ELSE
    UPDATE lists SET likes_count = greatest(likes_count - 1, 0) WHERE id = OLD.list_id;
    DELETE FROM notifications WHERE type = 'list_like' AND actor_id = OLD.user_id AND list_id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER list_likes_count AFTER INSERT OR DELETE ON public.list_likes
  FOR EACH ROW EXECUTE FUNCTION public.count_list_likes();--> statement-breakpoint

ALTER TABLE public.list_likes ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY list_likes_read ON public.list_likes FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY list_likes_own ON public.list_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY list_likes_unlike ON public.list_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());--> statement-breakpoint
GRANT SELECT ON public.list_likes TO anon, authenticated;--> statement-breakpoint
GRANT INSERT, DELETE ON public.list_likes TO authenticated;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Reports: founders / moderators decide
-- ---------------------------------------------------------------------------
-- action: 'hide' removes the content (reviews, categories and items are
-- hidden, comments and lists deleted); 'dismiss' keeps it. Every open report
-- on the same thing is closed together.
CREATE OR REPLACE FUNCTION public.resolve_report(report uuid, action text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r reports%ROWTYPE;
BEGIN
  IF NOT public.is_moderator() THEN
    RETURN 'forbidden';
  END IF;
  SELECT * INTO r FROM reports WHERE id = report;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF action = 'hide' THEN
    CASE r.target_type
      WHEN 'review' THEN UPDATE reviews SET status = 'hidden' WHERE id = r.target_id;
      WHEN 'category' THEN UPDATE categories SET status = 'hidden' WHERE id = r.target_id;
      WHEN 'item' THEN UPDATE items SET status = 'hidden' WHERE id = r.target_id;
      WHEN 'comment' THEN DELETE FROM review_comments WHERE id = r.target_id;
      WHEN 'list' THEN DELETE FROM lists WHERE id = r.target_id;
      ELSE NULL;
    END CASE;
  ELSIF action <> 'dismiss' THEN
    RETURN 'bad_action';
  END IF;
  UPDATE reports
     SET status = CASE WHEN action = 'hide' THEN 'resolved'::report_status ELSE 'dismissed'::report_status END,
         resolved_by = auth.uid()
   WHERE target_type = r.target_type AND target_id = r.target_id AND status = 'open';
  RETURN 'ok';
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.resolve_report(uuid, text) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.resolve_report(uuid, text) TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT ON public.reports TO authenticated;
