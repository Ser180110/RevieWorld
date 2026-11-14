-- "Elimina account": the signed-in user deletes themselves.
-- Deleting the auth user cascades to the profile and from there to reviews,
-- comments, likes, lists, follows, notifications and push subscriptions.
-- Categories and items the user created stay (created_by becomes null).
-- The user must type their own username, so a stray click can never do it.
CREATE OR REPLACE FUNCTION public.delete_my_account(confirm_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uname text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  SELECT username INTO uname FROM public.profiles WHERE id = uid;
  IF uname IS NULL OR lower(uname) <> lower(btrim(coalesce(confirm_username, ''))) THEN
    RETURN false;
  END IF;
  DELETE FROM public.profiles WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
  RETURN true;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.delete_my_account(text) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.delete_my_account(text) TO authenticated;
