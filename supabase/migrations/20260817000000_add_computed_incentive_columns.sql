-- Add computed incentive columns for snapshot-based calculations
ALTER TABLE employee_records 
ADD COLUMN total_weekend_hours numeric NOT NULL DEFAULT 0,
ADD COLUMN total_hours numeric NOT NULL DEFAULT 0,
ADD COLUMN extended_hours_incentive numeric NOT NULL DEFAULT 0,
ADD COLUMN weekend_incentive numeric NOT NULL DEFAULT 0,
ADD COLUMN total_incentive numeric NOT NULL DEFAULT 0;
