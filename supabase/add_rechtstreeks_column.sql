-- Add rechtstreeks column to time_entries table
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS rechtstreeks BOOLEAN DEFAULT false;

