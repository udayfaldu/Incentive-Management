-- 1. Drop existing tables if they exist
DROP TABLE IF EXISTS weekend_entries CASCADE;
DROP TABLE IF EXISTS employee_records CASCADE;
DROP TABLE IF EXISTS extended_tiers CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- 2. Create Settings Table
CREATE TABLE settings (
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  minimum_hours integer NOT NULL DEFAULT 170,
  weekend_senior_half numeric NOT NULL DEFAULT 750,
  weekend_senior_full numeric NOT NULL DEFAULT 1500,
  weekend_junior_half numeric NOT NULL DEFAULT 500,
  weekend_junior_full numeric NOT NULL DEFAULT 1000,
  PRIMARY KEY (year, month)
);

-- 3. Create Extended Tiers Table
-- id is text to support client-side default tier IDs like 'tier-default-1'
CREATE TABLE extended_tiers (
  id text PRIMARY KEY,
  year integer NOT NULL,
  month integer NOT NULL,
  "from" integer NOT NULL,
  "to" integer,
  senior_amount numeric NOT NULL DEFAULT 0,
  junior_amount numeric NOT NULL DEFAULT 0,
  FOREIGN KEY (year, month) REFERENCES settings(year, month) ON DELETE CASCADE
);

-- 4. Create Employee Records Table
-- id is text to support legacy seed IDs like 'seed-1'
CREATE TABLE employee_records (
  id text PRIMARY KEY,
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

-- 5. Create Weekend Entries Table
CREATE TABLE weekend_entries (
  id text PRIMARY KEY,
  employee_record_id text NOT NULL REFERENCES employee_records(id) ON DELETE CASCADE,
  date text NOT NULL, -- DD-MM-YYYY format
  hours numeric NOT NULL DEFAULT 0
);

-- 6. Indexes for Query Performance
CREATE INDEX idx_extended_tiers_lookup ON extended_tiers (year, month);
CREATE INDEX idx_employee_records_lookup ON employee_records (year, month);
CREATE INDEX idx_employee_records_emp_id ON employee_records (employee_id);
CREATE INDEX idx_weekend_entries_record ON weekend_entries (employee_record_id);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE extended_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekend_entries ENABLE ROW LEVEL SECURITY;

-- 8. Add permissive RLS Policies for Anonymous Access
-- Settings
CREATE POLICY "Allow public read settings" ON settings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert settings" ON settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update settings" ON settings FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete settings" ON settings FOR DELETE TO anon USING (true);

-- Extended Tiers
CREATE POLICY "Allow public read tiers" ON extended_tiers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert tiers" ON extended_tiers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update tiers" ON extended_tiers FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete tiers" ON extended_tiers FOR DELETE TO anon USING (true);

-- Employee Records
CREATE POLICY "Allow public read employee_records" ON employee_records FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert employee_records" ON employee_records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update employee_records" ON employee_records FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete employee_records" ON employee_records FOR DELETE TO anon USING (true);

-- Weekend Entries
CREATE POLICY "Allow public read weekend_entries" ON weekend_entries FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert weekend_entries" ON weekend_entries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update weekend_entries" ON weekend_entries FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete weekend_entries" ON weekend_entries FOR DELETE TO anon USING (true);
