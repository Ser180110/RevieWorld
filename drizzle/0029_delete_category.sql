-- Founders can delete a category; a category left without any review (all
-- deleted or moved away) and without subcategories is removed automatically,
-- and so is its parent if that one is now empty too.

CREATE OR REPLACE FUNCTION public.drop_empty_category(cat uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent uuid;
BEGIN
  WHILE cat IS NOT NULL LOOP
    IF NOT EXISTS (SELECT 1 FROM categories WHERE id = cat AND status = 'active')
       OR EXISTS (SELECT 1 FROM reviews r JOIN items i ON i.id = r.item_id WHERE i.category_id = cat)
       OR EXISTS (SELECT 1 FROM categories WHERE parent_id = cat AND status = 'active') THEN
      RETURN;
    END IF;
    SELECT parent_id INTO parent FROM categories WHERE id = cat;
    DELETE FROM categories WHERE id = cat;
    cat := parent;
  END LOOP;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.drop_empty_category(uuid) FROM PUBLIC, anon, authenticated;--> statement-breakpoint

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
  PERFORM public.drop_empty_category(cat);
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER reviews_drop_empty_category AFTER DELETE OR UPDATE OF item_id ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_drop_empty_category();--> statement-breakpoint

-- Founders only. Its subcategories move up one level; its items and their
-- reviews are deleted with it.
CREATE OR REPLACE FUNCTION public.delete_category(cat uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  parent uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN 'auth';
  END IF;
  IF NOT public.is_moderator()
     AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND badge IN ('founder', 'ideator')) THEN
    RETURN 'forbidden';
  END IF;
  SELECT parent_id INTO parent FROM categories WHERE id = cat AND status = 'active';
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  PERFORM set_config('rw.bulk', '1', true);
  UPDATE categories SET parent_id = parent WHERE parent_id = cat;
  UPDATE reports SET status = 'dismissed'
   WHERE status = 'open'
     AND (target_id = cat
          OR target_id IN (SELECT id FROM items WHERE category_id = cat)
          OR target_id IN (SELECT r.id FROM reviews r JOIN items i ON i.id = r.item_id WHERE i.category_id = cat));
  DELETE FROM categories WHERE id = cat;
  PERFORM set_config('rw.bulk', '', true);
  RETURN 'ok';
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.delete_category(uuid) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.delete_category(uuid) TO authenticated;--> statement-breakpoint

-- Same merge as before, but marked as a bulk change (see above).
CREATE OR REPLACE FUNCTION public.merge_category(src uuid, dst uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  it record;
  twin uuid;
  new_slug text;
  n int;
BEGIN
  IF uid IS NULL THEN
    RETURN 'auth';
  END IF;
  IF NOT public.is_moderator()
     AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND badge IN ('founder', 'ideator')) THEN
    RETURN 'forbidden';
  END IF;
  IF src = dst THEN
    RETURN 'same';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM categories WHERE id = src AND status = 'active')
     OR NOT EXISTS (SELECT 1 FROM categories WHERE id = dst AND status = 'active') THEN
    RETURN 'not_found';
  END IF;
  -- The merge empties src on purpose: don't let the clean-up trigger remove it.
  PERFORM set_config('rw.bulk', '1', true);

  FOR it IN SELECT id, slug, normalized_name FROM items WHERE category_id = src LOOP
    SELECT id INTO twin FROM items WHERE category_id = dst AND normalized_name = it.normalized_name;
    IF twin IS NULL THEN
      new_slug := it.slug;
      n := 2;
      WHILE EXISTS (SELECT 1 FROM items WHERE category_id = dst AND slug = new_slug) LOOP
        new_slug := it.slug || '-' || n;
        n := n + 1;
      END LOOP;
      UPDATE items SET category_id = dst, slug = new_slug WHERE id = it.id;
    ELSE
      -- Same thing in both: join them. A user with a review in both keeps the one in dst.
      DELETE FROM reviews r
      WHERE r.item_id = it.id
        AND EXISTS (SELECT 1 FROM reviews r2 WHERE r2.item_id = twin AND r2.user_id = r.user_id);
      UPDATE reviews SET item_id = twin WHERE item_id = it.id;
      UPDATE list_items l SET item_id = twin
      WHERE l.item_id = it.id AND NOT EXISTS (SELECT 1 FROM list_items x WHERE x.list_id = l.list_id AND x.item_id = twin);
      UPDATE watchlist w SET item_id = twin
      WHERE w.item_id = it.id AND NOT EXISTS (SELECT 1 FROM watchlist x WHERE x.user_id = w.user_id AND x.item_id = twin);
      UPDATE profile_favorites f SET item_id = twin
      WHERE f.item_id = it.id AND NOT EXISTS (SELECT 1 FROM profile_favorites x WHERE x.user_id = f.user_id AND x.item_id = twin);
      DELETE FROM items WHERE id = it.id;
    END IF;
  END LOOP;

  -- Subcategories follow; if dst itself was inside src, it takes src's place.
  UPDATE categories SET parent_id = (SELECT parent_id FROM categories WHERE id = src)
  WHERE id = dst AND parent_id = src;
  UPDATE categories SET parent_id = dst WHERE parent_id = src AND id <> dst;

  INSERT INTO category_follows (user_id, category_id)
  SELECT user_id, dst FROM category_follows WHERE category_id = src
  ON CONFLICT DO NOTHING;

  UPDATE categories SET status = 'merged', merged_into_id = dst, parent_id = NULL WHERE id = src;

  -- Items moved without their reviews firing the counters: recount both.
  UPDATE categories c
  SET items_count = (SELECT count(*) FROM items i WHERE i.category_id = c.id),
      reviews_count = (
        SELECT count(*) FROM reviews r JOIN items i ON i.id = r.item_id
        WHERE i.category_id = c.id AND r.status = 'active'
      )
  WHERE c.id IN (src, dst);
  RETURN 'ok';
END;
$$;--> statement-breakpoint

