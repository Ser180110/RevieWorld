-- Like and comment counters: recount from the source rows instead of +1/-1,
-- so they can never drift, and repair any count that already drifted.

CREATE OR REPLACE FUNCTION public.count_review_likes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.review_id ELSE NEW.review_id END;
BEGIN
  UPDATE reviews
     SET likes_count = (SELECT count(*) FROM review_likes WHERE review_id = target)
   WHERE id = target;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.count_review_comments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.review_id ELSE NEW.review_id END;
BEGIN
  UPDATE reviews
     SET comments_count = (SELECT count(*) FROM review_comments WHERE review_id = target)
   WHERE id = target;
  RETURN NULL;
END;
$$;--> statement-breakpoint

UPDATE public.reviews r
   SET likes_count = (SELECT count(*) FROM public.review_likes l WHERE l.review_id = r.id),
       comments_count = (SELECT count(*) FROM public.review_comments c WHERE c.review_id = r.id);
