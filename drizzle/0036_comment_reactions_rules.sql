-- Everyone sees the reactions; each person adds, changes or removes only their own.
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY comment_reactions_read ON public.comment_reactions FOR SELECT TO anon, authenticated
  USING (true);--> statement-breakpoint
CREATE POLICY comment_reactions_insert_own ON public.comment_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY comment_reactions_update_own ON public.comment_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY comment_reactions_delete_own ON public.comment_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());--> statement-breakpoint
GRANT SELECT ON public.comment_reactions TO anon, authenticated;--> statement-breakpoint
GRANT INSERT (comment_id, user_id, emoji) ON public.comment_reactions TO authenticated;--> statement-breakpoint
GRANT UPDATE (emoji) ON public.comment_reactions TO authenticated;--> statement-breakpoint
GRANT DELETE ON public.comment_reactions TO authenticated;--> statement-breakpoint

-- Someone you blocked can't react to your comments.
CREATE OR REPLACE FUNCTION public.forbid_blocked_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner uuid;
BEGIN
  SELECT user_id INTO owner FROM review_comments WHERE id = NEW.comment_id;
  IF owner IS NOT NULL AND public.is_blocked(owner, NEW.user_id) THEN
    RAISE EXCEPTION 'blocked' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER comment_reactions_not_blocked BEFORE INSERT ON public.comment_reactions
  FOR EACH ROW EXECUTE FUNCTION public.forbid_blocked_reaction();
