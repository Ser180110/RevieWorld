-- Rules for favourites, "Da provare" (watchlist) and review comments.

CREATE OR REPLACE FUNCTION public.count_review_comments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET comments_count = comments_count + 1 WHERE id = NEW.review_id;
  ELSE
    UPDATE reviews SET comments_count = comments_count - 1 WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER review_comments_count AFTER INSERT OR DELETE ON public.review_comments
  FOR EACH ROW EXECUTE FUNCTION public.count_review_comments();--> statement-breakpoint

-- Reviewing something takes it off your "Da provare" list.
CREATE OR REPLACE FUNCTION public.clear_watchlist_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM watchlist WHERE user_id = NEW.user_id AND item_id = NEW.item_id;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER reviews_clear_watchlist AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.clear_watchlist_on_review();--> statement-breakpoint

ALTER TABLE public.profile_favorites ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY profile_favorites_read ON public.profile_favorites FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY profile_favorites_insert_own ON public.profile_favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY profile_favorites_delete_own ON public.profile_favorites FOR DELETE TO authenticated USING (user_id = auth.uid());--> statement-breakpoint

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY watchlist_read ON public.watchlist FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY watchlist_insert_own ON public.watchlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY watchlist_delete_own ON public.watchlist FOR DELETE TO authenticated USING (user_id = auth.uid());--> statement-breakpoint

ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY review_comments_read ON public.review_comments FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY review_comments_insert_own ON public.review_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.status = 'active')
  );--> statement-breakpoint
-- Authors delete their comments; review authors can remove comments under their review.
CREATE POLICY review_comments_delete ON public.review_comments FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid())
  );--> statement-breakpoint

GRANT SELECT ON public.profile_favorites, public.watchlist, public.review_comments TO anon, authenticated;--> statement-breakpoint
GRANT INSERT, DELETE ON public.profile_favorites, public.watchlist, public.review_comments TO authenticated;
