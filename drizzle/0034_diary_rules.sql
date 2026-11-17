-- Diary entries are public like reviews; everyone writes only their own.
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY diary_entries_read ON public.diary_entries FOR SELECT TO anon, authenticated
  USING (true);--> statement-breakpoint
CREATE POLICY diary_entries_insert_own ON public.diary_entries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (review_id IS NULL OR EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid()))
  );--> statement-breakpoint
CREATE POLICY diary_entries_update_own ON public.diary_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY diary_entries_delete_own ON public.diary_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());--> statement-breakpoint
GRANT SELECT ON public.diary_entries TO anon, authenticated;--> statement-breakpoint
GRANT INSERT (user_id, item_id, review_id, rating, experienced_on) ON public.diary_entries TO authenticated;--> statement-breakpoint
GRANT UPDATE (rating, experienced_on) ON public.diary_entries TO authenticated;--> statement-breakpoint
GRANT DELETE ON public.diary_entries TO authenticated;--> statement-breakpoint

-- Every review written so far becomes its first diary entry, on the day it was written.
INSERT INTO public.diary_entries (user_id, item_id, review_id, rating, experienced_on, created_at)
SELECT r.user_id, r.item_id, r.id, r.rating, (r.created_at AT TIME ZONE 'Europe/Rome')::date, r.created_at
FROM public.reviews r
WHERE NOT EXISTS (SELECT 1 FROM public.diary_entries d WHERE d.review_id = r.id);
--> statement-breakpoint

-- When a review moves to another item ("Sposta", merging categories), its diary
-- entries (also the "Riprovato" ones) move with it.
CREATE OR REPLACE FUNCTION public.diary_follow_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.item_id IS DISTINCT FROM OLD.item_id THEN
    UPDATE diary_entries SET item_id = NEW.item_id
     WHERE user_id = NEW.user_id AND item_id = OLD.item_id;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER reviews_diary_follow AFTER UPDATE OF item_id ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.diary_follow_review();
