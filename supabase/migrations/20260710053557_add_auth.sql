-- 1. Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Drop public/anon tables to migrate schema
DROP TABLE IF EXISTS weekend_entries CASCADE;
DROP TABLE IF EXISTS employee_records CASCADE;
DROP TABLE IF EXISTS extended_tiers CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- 3. Create settings table scoped to user_id
CREATE TABLE settings (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  minimum_hours integer NOT NULL DEFAULT 170,
  weekend_senior_half numeric NOT NULL DEFAULT 750,
  weekend_senior_full numeric NOT NULL DEFAULT 1500,
  weekend_junior_half numeric NOT NULL DEFAULT 500,
  weekend_junior_full numeric NOT NULL DEFAULT 1000,
  PRIMARY KEY (user_id, year, month)
);

-- 4. Create extended_tiers table scoped to user_id
CREATE TABLE extended_tiers (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  year integer NOT NULL,
  month integer NOT NULL,
  "from" integer NOT NULL,
  "to" integer,
  senior_amount numeric NOT NULL DEFAULT 0,
  junior_amount numeric NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id, year, month) REFERENCES settings(user_id, year, month) ON DELETE CASCADE
);

-- 5. Create employee_records table scoped to user_id
CREATE TABLE employee_records (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('Senior', 'Junior')),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  weekday_hours numeric NOT NULL DEFAULT 0,
  leaves integer NOT NULL DEFAULT 0,
  remarks text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create weekend_entries table referencing employee_records
CREATE TABLE weekend_entries (
  id text PRIMARY KEY,
  employee_record_id text NOT NULL REFERENCES employee_records(id) ON DELETE CASCADE,
  date text NOT NULL,
  hours numeric NOT NULL DEFAULT 0
);

-- 7. Indexes for Performance
CREATE INDEX idx_extended_tiers_user ON extended_tiers (user_id, year, month);
CREATE INDEX idx_employee_records_user ON employee_records (user_id, year, month);
CREATE INDEX idx_weekend_entries_rel ON weekend_entries (employee_record_id);

-- 8. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE extended_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekend_entries ENABLE ROW LEVEL SECURITY;

-- 9. Add RLS Policies
-- Profiles
CREATE POLICY "Allow profiles read access" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow profile owner updates" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Settings
CREATE POLICY "Manage own settings" ON settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Extended Tiers
CREATE POLICY "Manage own tiers" ON extended_tiers
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Employee Records
CREATE POLICY "Manage own records" ON employee_records
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Weekend Entries (validates that parent record belongs to the user)
CREATE POLICY "Manage own weekend_entries" ON weekend_entries
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM employee_records
      WHERE employee_records.id = weekend_entries.employee_record_id
        AND employee_records.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee_records
      WHERE employee_records.id = weekend_entries.employee_record_id
        AND employee_records.user_id = auth.uid()
    )
  );

-- 10. Auto-Profile Trigger for Signups
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

CREATE OR REPLACE FUNCTION public.setup_trigger()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT public.setup_trigger();
DROP FUNCTION public.setup_trigger();
