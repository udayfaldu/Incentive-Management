-- 1. Remove the pre-seeding call from public.handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the seeding helper function
DROP FUNCTION IF EXISTS public.seed_default_settings_for_user(uuid);

-- 3. Truncate/clear the settings and extended_tiers tables to make them completely clean
TRUNCATE TABLE public.settings CASCADE;
