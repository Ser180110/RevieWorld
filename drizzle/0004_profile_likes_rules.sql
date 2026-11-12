-- Rules for likes, the new profile fields and profile pictures.

-- Profile field limits (declared in schema.ts).
ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500);--> statement-breakpoint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_display_name_length CHECK (display_name IS NULL OR char_length(display_name) <= 60);--> statement-breakpoint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_location_length CHECK (location IS NULL OR char_length(location) <= 80);--> statement-breakpoint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_website_format CHECK (website IS NULL OR website ~ '^https?://');--> statement-breakpoint

-- Users may edit the new profile fields.
GRANT UPDATE (username, display_name, avatar_url, bio, location, website, locale) ON public.profiles TO authenticated;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Likes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_review_likes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET likes_count = likes_count + 1 WHERE id = NEW.review_id;
  ELSE
    UPDATE reviews SET likes_count = likes_count - 1 WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER review_likes_count AFTER INSERT OR DELETE ON public.review_likes
  FOR EACH ROW EXECUTE FUNCTION public.count_review_likes();--> statement-breakpoint

-- No liking your own review.
CREATE OR REPLACE FUNCTION public.forbid_self_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM reviews WHERE id = NEW.review_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'cannot like your own review' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER review_likes_not_self BEFORE INSERT ON public.review_likes
  FOR EACH ROW EXECUTE FUNCTION public.forbid_self_like();--> statement-breakpoint

ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY review_likes_read ON public.review_likes FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY review_likes_own ON public.review_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY review_likes_unlike ON public.review_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());--> statement-breakpoint
GRANT SELECT ON public.review_likes TO anon, authenticated;--> statement-breakpoint
GRANT INSERT, DELETE ON public.review_likes TO authenticated;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Profile pictures: public bucket, path = <user id>/<file>, max 2 MB.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
CREATE POLICY avatars_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);--> statement-breakpoint
CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);--> statement-breakpoint
CREATE POLICY avatars_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
