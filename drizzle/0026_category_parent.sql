-- Tidy up the category tree: put a category inside another one (or back on
-- top). Allowed to its creator, the founders (badge founder / ideator) and
-- moderators. A category can never end up inside itself or its own subcategories.
CREATE OR REPLACE FUNCTION public.set_category_parent(cat uuid, new_parent uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  owner uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN 'auth';
  END IF;
  SELECT created_by INTO owner FROM categories WHERE id = cat AND status = 'active';
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF owner IS DISTINCT FROM uid
     AND NOT public.is_moderator()
     AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND badge IN ('founder', 'ideator')) THEN
    RETURN 'forbidden';
  END IF;
  IF new_parent IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM categories WHERE id = new_parent AND status = 'active') THEN
      RETURN 'not_found';
    END IF;
    -- new_parent must not be cat or one of its descendants.
    IF EXISTS (
      WITH RECURSIVE down(id) AS (
        SELECT cat
        UNION
        SELECT c.id FROM categories c JOIN down d ON c.parent_id = d.id
      )
      SELECT 1 FROM down WHERE id = new_parent
    ) THEN
      RETURN 'loop';
    END IF;
  END IF;
  UPDATE categories SET parent_id = new_parent WHERE id = cat;
  RETURN 'ok';
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.set_category_parent(uuid, uuid) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.set_category_parent(uuid, uuid) TO authenticated;
--> statement-breakpoint
-- Merge a duplicate category (src) into another one (dst). Founders and
-- moderators only. Everything moves to dst: items (same name = joined),
-- reviews with their likes and comments, lists, "da provare", favourites,
-- followers and subcategories. src stays as a "merged" pointer, so its old
-- link and its name keep leading to dst.
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
REVOKE ALL ON FUNCTION public.merge_category(uuid, uuid) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.merge_category(uuid, uuid) TO authenticated;
