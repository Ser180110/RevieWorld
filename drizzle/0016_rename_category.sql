-- The creator of a category can fix its name (typos!) as long as nobody else
-- has reviewed in it yet; moderators always can. The old name is kept as an alias.
-- Returns: 'ok', 'forbidden' (not yours), 'locked' (others already reviewed),
-- 'duplicate' (another category already has that name).
CREATE OR REPLACE FUNCTION public.rename_category(cat uuid, new_name text, new_normalized text, new_slug text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c categories%ROWTYPE;
  moderator boolean := public.is_moderator();
BEGIN
  SELECT * INTO c FROM categories WHERE id = cat;
  IF NOT FOUND OR (c.created_by IS DISTINCT FROM auth.uid() AND NOT moderator) THEN
    RETURN 'forbidden';
  END IF;
  IF NOT moderator AND EXISTS (
    SELECT 1 FROM reviews r JOIN items i ON i.id = r.item_id
     WHERE i.category_id = cat AND r.user_id <> c.created_by
  ) THEN
    RETURN 'locked';
  END IF;
  IF char_length(btrim(new_name)) NOT BETWEEN 2 AND 60 OR char_length(new_normalized) < 2 OR new_slug !~ '^[a-z0-9-]{1,80}$' THEN
    RETURN 'forbidden';
  END IF;
  IF EXISTS (SELECT 1 FROM categories WHERE normalized_name = new_normalized AND id <> cat) THEN
    RETURN 'duplicate';
  END IF;
  IF c.normalized_name <> new_normalized THEN
    INSERT INTO category_aliases (category_id, alias, normalized_alias) VALUES (cat, c.name, c.normalized_name);
  END IF;
  UPDATE categories SET name = btrim(new_name), normalized_name = new_normalized, slug = new_slug WHERE id = cat;
  RETURN 'ok';
EXCEPTION WHEN unique_violation THEN
  RETURN 'duplicate';
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.rename_category(uuid, text, text, text) FROM public, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.rename_category(uuid, text, text, text) TO authenticated;
