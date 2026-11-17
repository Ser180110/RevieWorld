-- A thing left without reviews (all deleted or moved away) is removed too,
-- like an empty category: it no longer shows up in "I più votati".
-- Its "Riprovato" diary entries, list entries and "Da provare" go with it.
CREATE OR REPLACE FUNCTION public.reviews_drop_empty_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat uuid;
BEGIN
  IF current_setting('rw.bulk', true) = '1' THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.item_id = OLD.item_id THEN
    RETURN NULL;
  END IF;
  SELECT category_id INTO cat FROM items WHERE id = OLD.item_id;
  IF NOT EXISTS (SELECT 1 FROM reviews WHERE item_id = OLD.item_id) THEN
    DELETE FROM items WHERE id = OLD.item_id;
  END IF;
  PERFORM public.drop_empty_category(cat);
  RETURN NULL;
END;
$$;--> statement-breakpoint

-- Clean up the things that already have no reviews.
DELETE FROM public.items i
 WHERE NOT EXISTS (SELECT 1 FROM public.reviews r WHERE r.item_id = i.id);
