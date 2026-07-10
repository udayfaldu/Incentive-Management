-- Create a helper function to seed default settings and tiers for a user
CREATE OR REPLACE FUNCTION public.seed_default_settings_for_user(user_uuid uuid)
RETURNS void AS $$
DECLARE
  m integer;
  y integer;
  tier_1_id text;
  tier_2_id text;
BEGIN
  -- Loop through years 2026 and 2027
  FOR y IN 2026..2027 LOOP
    -- Loop through months 1 to 12
    FOR m IN 1..12 LOOP
      -- Insert settings if not exists
      INSERT INTO public.settings (user_id, year, month, minimum_hours, weekend_senior_half, weekend_senior_full, weekend_junior_half, weekend_junior_full)
      VALUES (user_uuid, y, m, 170, 750, 1500, 500, 1000)
      ON CONFLICT (user_id, year, month) DO NOTHING;

      -- Insert tiers if settings were inserted or already exist
      tier_1_id := 'tier-default-1-' || user_uuid || '-' || y || '-' || m;
      tier_2_id := 'tier-default-2-' || user_uuid || '-' || y || '-' || m;

      INSERT INTO public.extended_tiers (id, user_id, year, month, "from", "to", senior_amount, junior_amount)
      VALUES 
        (tier_1_id, user_uuid, y, m, 170, 185, 2000, 1500),
        (tier_2_id, user_uuid, y, m, 186, NULL, 3500, 2500)
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed existing users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM auth.users LOOP
    PERFORM public.seed_default_settings_for_user(r.id);
  END LOOP;
END;
$$;

-- Update handle_new_user trigger function to also seed settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    new.email
  );

  -- Seed default settings for the new user
  PERFORM public.seed_default_settings_for_user(new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
