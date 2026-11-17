-- New accounts from "Continua con Google" have no username: build one from
-- the email (mario.rossi@gmail.com -> mariorossi, mariorossi2 if taken) and
-- take name and photo from Google ("full_name"/"name", "avatar_url"/"picture").
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  wanted text := regexp_replace(coalesce(meta ->> 'username', ''), '[^a-zA-Z0-9_]', '', 'g');
  base text;
  n int := 1;
BEGIN
  IF char_length(wanted) < 3
     OR EXISTS (SELECT 1 FROM profiles WHERE lower(username) = lower(wanted)) THEN
    base := lower(regexp_replace(split_part(coalesce(NEW.email, ''), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
    IF char_length(base) < 3 THEN
      base := lower(regexp_replace(coalesce(meta ->> 'full_name', meta ->> 'name', ''), '[^a-zA-Z0-9_]', '', 'g'));
    END IF;
    IF char_length(wanted) >= 3 THEN
      base := lower(wanted);
    END IF;
    IF char_length(base) < 3 THEN
      base := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 10);
    END IF;
    base := left(base, 26);
    wanted := base;
    WHILE EXISTS (SELECT 1 FROM profiles WHERE lower(username) = lower(wanted)) LOOP
      n := n + 1;
      IF n > 60 THEN
        wanted := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 10);
        EXIT;
      END IF;
      wanted := base || n::text;
    END LOOP;
  END IF;
  INSERT INTO profiles (id, username, display_name, avatar_url, locale)
  VALUES (
    NEW.id,
    left(wanted, 30),
    left(nullif(btrim(coalesce(meta ->> 'full_name', meta ->> 'name', '')), ''), 60),
    coalesce(meta ->> 'avatar_url', meta ->> 'picture'),
    CASE WHEN meta ->> 'locale' = 'en' THEN 'en'::locale ELSE 'it'::locale END
  );
  RETURN NEW;
END;
$$;
