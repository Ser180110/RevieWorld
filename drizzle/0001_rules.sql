-- Hand-written rules that Drizzle does not model:
-- auth link, fuzzy duplicate search, counters, Row Level Security, photo storage.
-- Written for Supabase (schemas `auth`, `storage`, `extensions`, roles `anon`/`authenticated`).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Links Drizzle cannot express
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_auth_users_fk
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE public.categories
  ADD CONSTRAINT categories_merged_into_fk
  FOREIGN KEY (merged_into_id) REFERENCES public.categories (id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE public.items
  ADD CONSTRAINT items_merged_into_fk
  FOREIGN KEY (merged_into_id) REFERENCES public.items (id) ON DELETE SET NULL;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Fuzzy search indexes (duplicate detection while typing)
-- ---------------------------------------------------------------------------
CREATE INDEX categories_normalized_trgm_idx
  ON public.categories USING gin (normalized_name extensions.gin_trgm_ops);--> statement-breakpoint
CREATE INDEX category_aliases_normalized_trgm_idx
  ON public.category_aliases USING gin (normalized_alias extensions.gin_trgm_ops);--> statement-breakpoint
CREATE INDEX items_normalized_trgm_idx
  ON public.items USING gin (normalized_name extensions.gin_trgm_ops);--> statement-breakpoint

-- Categories similar to `q` (already normalized by the app), best first.
-- Matches on the name or on any alias. Call with supabase.rpc('suggest_categories', { q }).
CREATE OR REPLACE FUNCTION public.suggest_categories(q text, max_results int DEFAULT 8)
RETURNS TABLE (id uuid, name text, slug text, reviews_count int, followers_count int, score real)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT c.id, c.name, c.slug, c.reviews_count, c.followers_count,
         greatest(similarity(c.normalized_name, q), coalesce(max(similarity(a.normalized_alias, q)), 0)) AS score
  FROM categories c
  LEFT JOIN category_aliases a ON a.category_id = c.id
  WHERE c.status = 'active'
    AND (c.normalized_name % q OR a.normalized_alias % q
         OR c.normalized_name LIKE q || '%' OR a.normalized_alias LIKE q || '%')
  GROUP BY c.id
  ORDER BY score DESC, c.reviews_count DESC
  LIMIT least(max_results, 20);
$$;--> statement-breakpoint

-- Items similar to `q` inside one category.
CREATE OR REPLACE FUNCTION public.suggest_items(cat uuid, q text, max_results int DEFAULT 8)
RETURNS TABLE (id uuid, name text, slug text, reviews_count int, avg_rating numeric, score real)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT i.id, i.name, i.slug, i.reviews_count, i.avg_rating,
         similarity(i.normalized_name, q) AS score
  FROM items i
  WHERE i.category_id = cat
    AND i.status = 'active'
    AND (i.normalized_name % q OR i.normalized_name LIKE q || '%')
  ORDER BY score DESC, i.reviews_count DESC
  LIMIT least(max_results, 20);
$$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Profiles: created automatically at sign-up
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wanted text := regexp_replace(coalesce(NEW.raw_user_meta_data ->> 'username', ''), '[^a-zA-Z0-9_]', '', 'g');
BEGIN
  IF char_length(wanted) < 3
     OR EXISTS (SELECT 1 FROM profiles WHERE lower(username) = lower(wanted)) THEN
    wanted := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 10);
  END IF;
  INSERT INTO profiles (id, username, display_name, avatar_url, locale)
  VALUES (
    NEW.id,
    left(wanted, 30),
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    CASE WHEN NEW.raw_user_meta_data ->> 'locale' = 'en' THEN 'en'::locale ELSE 'it'::locale END
  );
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER categories_touch BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER items_touch BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER reviews_touch BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER reports_touch BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Counters (kept on the rows so lists and rankings cost one query)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE categories SET items_count = items_count + 1 WHERE id = NEW.category_id;
  END IF;
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    UPDATE categories SET items_count = items_count - 1 WHERE id = OLD.category_id;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER items_count AFTER INSERT OR DELETE OR UPDATE OF category_id ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.count_items();--> statement-breakpoint

-- Adds (sign = 1) or removes (sign = -1) one review from its item and category.
CREATE OR REPLACE FUNCTION public.apply_review(item uuid, rating int, sign int)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH upd AS (
    UPDATE items
    SET reviews_count = reviews_count + sign,
        rating_sum = rating_sum + sign * rating,
        avg_rating = CASE WHEN reviews_count + sign > 0
                          THEN round((rating_sum + sign * rating)::numeric / (reviews_count + sign), 2)
                     END
    WHERE id = item
    RETURNING category_id
  )
  UPDATE categories SET reviews_count = reviews_count + sign
  WHERE id = (SELECT category_id FROM upd);
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.apply_review(uuid, int, int) FROM public, anon, authenticated;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.count_reviews()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only active reviews count towards averages.
  IF TG_OP IN ('DELETE', 'UPDATE') AND OLD.status = 'active' THEN
    PERFORM apply_review(OLD.item_id, OLD.rating, -1);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.status = 'active' THEN
    PERFORM apply_review(NEW.item_id, NEW.rating, 1);
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER reviews_count AFTER INSERT OR DELETE OR UPDATE OF rating, status, item_id ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.count_reviews();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.count_category_follows()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE categories SET followers_count = followers_count + 1 WHERE id = NEW.category_id;
  ELSE
    UPDATE categories SET followers_count = followers_count - 1 WHERE id = OLD.category_id;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER category_follows_count AFTER INSERT OR DELETE ON public.category_follows
  FOR EACH ROW EXECUTE FUNCTION public.count_category_follows();--> statement-breakpoint

-- Whoever creates a category joins it automatically.
CREATE OR REPLACE FUNCTION public.follow_own_category()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO category_follows (user_id, category_id) VALUES (NEW.created_by, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER categories_follow_own AFTER INSERT ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.follow_own_category();--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Reads are public, writes need a signed-in user, and each user changes only
-- their own rows. Moderators and admins can change everything.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  );
$$;--> statement-breakpoint

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.category_aliases ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.review_photos ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.category_follows ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- profiles
CREATE POLICY profiles_read ON public.profiles FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());--> statement-breakpoint
-- Users must not promote themselves: only moderators may change `role`.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;--> statement-breakpoint
GRANT UPDATE (username, display_name, avatar_url, bio, locale) ON public.profiles TO authenticated;--> statement-breakpoint

-- categories
CREATE POLICY categories_read ON public.categories FOR SELECT
  USING (status <> 'hidden' OR public.is_moderator());--> statement-breakpoint
CREATE POLICY categories_create ON public.categories FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND status = 'active');--> statement-breakpoint
CREATE POLICY categories_moderate ON public.categories FOR UPDATE TO authenticated
  USING (public.is_moderator()) WITH CHECK (public.is_moderator());--> statement-breakpoint
CREATE POLICY categories_delete ON public.categories FOR DELETE TO authenticated
  USING (public.is_moderator());--> statement-breakpoint

-- category_aliases (moderators only; created mostly by merges)
CREATE POLICY category_aliases_read ON public.category_aliases FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY category_aliases_moderate ON public.category_aliases FOR ALL TO authenticated
  USING (public.is_moderator()) WITH CHECK (public.is_moderator());--> statement-breakpoint

-- items
CREATE POLICY items_read ON public.items FOR SELECT
  USING (status <> 'hidden' OR public.is_moderator());--> statement-breakpoint
CREATE POLICY items_create ON public.items FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND status = 'active');--> statement-breakpoint
CREATE POLICY items_moderate ON public.items FOR UPDATE TO authenticated
  USING (public.is_moderator()) WITH CHECK (public.is_moderator());--> statement-breakpoint
CREATE POLICY items_delete ON public.items FOR DELETE TO authenticated
  USING (public.is_moderator());--> statement-breakpoint

-- reviews
CREATE POLICY reviews_read ON public.reviews FOR SELECT
  USING (status = 'active' OR user_id = auth.uid() OR public.is_moderator());--> statement-breakpoint
CREATE POLICY reviews_create ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'active');--> statement-breakpoint
CREATE POLICY reviews_update_own ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_moderator())
  WITH CHECK (user_id = auth.uid() OR public.is_moderator());--> statement-breakpoint
CREATE POLICY reviews_delete_own ON public.reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_moderator());--> statement-breakpoint
-- Authors edit text and rating; only moderators hide a review.
REVOKE UPDATE ON public.reviews FROM anon, authenticated;--> statement-breakpoint
GRANT UPDATE (rating, body, contains_spoiler) ON public.reviews TO authenticated;--> statement-breakpoint

-- review_photos
CREATE POLICY review_photos_read ON public.review_photos FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY review_photos_own ON public.review_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid()));--> statement-breakpoint

-- follows
CREATE POLICY category_follows_read ON public.category_follows FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY category_follows_own ON public.category_follows FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY category_follows_unfollow ON public.category_follows FOR DELETE TO authenticated
  USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY user_follows_read ON public.user_follows FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY user_follows_own ON public.user_follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());--> statement-breakpoint
CREATE POLICY user_follows_unfollow ON public.user_follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());--> statement-breakpoint

-- reports: anyone signed in can report; only moderators read and resolve
CREATE POLICY reports_create ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'open' AND resolved_by IS NULL);--> statement-breakpoint
CREATE POLICY reports_moderate ON public.reports FOR ALL TO authenticated
  USING (public.is_moderator()) WITH CHECK (public.is_moderator());--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Photo storage: public bucket, each user writes only in their own folder
-- (path = <user id>/<file>), max 5 MB, images only.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-photos', 'review-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
CREATE POLICY review_photos_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text);--> statement-breakpoint
CREATE POLICY review_photos_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
