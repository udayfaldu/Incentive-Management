-- Add send_to_bd column to employee_records table
ALTER TABLE employee_records ADD COLUMN send_to_bd boolean NOT NULL DEFAULT false;
