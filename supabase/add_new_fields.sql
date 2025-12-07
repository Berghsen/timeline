-- Add new fields to time_entries table
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS niet_gewerkt TEXT,
ADD COLUMN IF NOT EXISTS verlof TEXT,
ADD COLUMN IF NOT EXISTS ziek TEXT;

