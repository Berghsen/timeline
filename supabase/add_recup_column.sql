-- Add recup column to time_entries table
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS recup BOOLEAN DEFAULT false;

