-- Sergio (badge 'founder') can see everyone who has an account: when they
-- signed up, their e-mail, whether they confirmed it and how active they are.
CREATE OR REPLACE FUNCTION public.admin_users()
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  email text,
  signed_up_at timestamptz,
  confirmed boolean,
  last_sign_in_at timestamptz,
  reviews int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.badge = 'founder') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.display_name, p.avatar_url,
         u.email::text, u.created_at, u.email_confirmed_at IS NOT NULL, u.last_sign_in_at,
         (SELECT count(*)::int FROM reviews r WHERE r.user_id = p.id AND r.status = 'active')
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY u.created_at DESC;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.admin_users() FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.admin_users() TO authenticated;
