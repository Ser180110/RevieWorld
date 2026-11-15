-- Move one's own review to another item (e.g. into another category or a new
-- subcategory). The count triggers move the numbers along. If the old item was
-- created by the same user and is now completely unused, it is removed too.
CREATE OR REPLACE FUNCTION public.move_review(p_review uuid, p_item uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  old_item uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN 'auth';
  END IF;
  SELECT item_id INTO old_item FROM reviews WHERE id = p_review AND user_id = uid;
  IF old_item IS NULL THEN
    RETURN 'not_found';
  END IF;
  IF old_item = p_item THEN
    RETURN 'ok';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM items i JOIN categories c ON c.id = i.category_id
    WHERE i.id = p_item AND i.status = 'active' AND c.status = 'active'
  ) THEN
    RETURN 'not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM reviews WHERE user_id = uid AND item_id = p_item) THEN
    RETURN 'already';
  END IF;

  UPDATE reviews SET item_id = p_item WHERE id = p_review;

  DELETE FROM items i
  WHERE i.id = old_item
    AND i.created_by = uid
    AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.item_id = i.id)
    AND NOT EXISTS (SELECT 1 FROM list_items l WHERE l.item_id = i.id)
    AND NOT EXISTS (SELECT 1 FROM watchlist w WHERE w.item_id = i.id)
    AND NOT EXISTS (SELECT 1 FROM profile_favorites f WHERE f.item_id = i.id);
  RETURN 'ok';
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.move_review(uuid, uuid) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.move_review(uuid, uuid) TO authenticated;
