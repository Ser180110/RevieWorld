-- Rules for lists: counters, owner-only writes, public reads.

CREATE TRIGGER lists_touch BEFORE UPDATE ON public.lists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.count_list_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lists SET items_count = items_count + 1, updated_at = now() WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lists SET items_count = items_count - 1, updated_at = now() WHERE id = OLD.list_id;
  ELSE
    UPDATE lists SET updated_at = now() WHERE id = NEW.list_id;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER list_items_count AFTER INSERT OR UPDATE OR DELETE ON public.list_items
  FOR EACH ROW EXECUTE FUNCTION public.count_list_items();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.owns_list(list uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM lists WHERE id = list AND user_id = auth.uid());
$$;--> statement-breakpoint

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY lists_read ON public.lists FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY lists_insert_own ON public.lists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY lists_update_own ON public.lists FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY lists_delete_own ON public.lists FOR DELETE TO authenticated USING (user_id = auth.uid());--> statement-breakpoint

ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY list_items_read ON public.list_items FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY list_items_insert_own ON public.list_items FOR INSERT TO authenticated WITH CHECK (public.owns_list(list_id));--> statement-breakpoint
CREATE POLICY list_items_update_own ON public.list_items FOR UPDATE TO authenticated
  USING (public.owns_list(list_id)) WITH CHECK (public.owns_list(list_id));--> statement-breakpoint
CREATE POLICY list_items_delete_own ON public.list_items FOR DELETE TO authenticated USING (public.owns_list(list_id));--> statement-breakpoint

GRANT SELECT ON public.lists, public.list_items TO anon, authenticated;--> statement-breakpoint
GRANT INSERT, DELETE ON public.lists, public.list_items TO authenticated;--> statement-breakpoint
GRANT UPDATE (title, description, ranked) ON public.lists TO authenticated;--> statement-breakpoint
GRANT UPDATE (position) ON public.list_items TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.owns_list(uuid) TO anon, authenticated;
