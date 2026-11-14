-- 🍓 on the profile background is only for the founders (profiles with a
-- badge). Anyone else who sets it gets no pattern instead.
CREATE OR REPLACE FUNCTION public.profiles_exclusive_emoji()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.theme_emoji = '🍓' AND NEW.badge IS NULL THEN
    NEW.theme_emoji := NULL;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER profiles_exclusive_emoji BEFORE INSERT OR UPDATE OF theme_emoji, badge ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_exclusive_emoji();--> statement-breakpoint
UPDATE public.profiles SET theme_emoji = NULL WHERE theme_emoji = '🍓' AND badge IS NULL;
