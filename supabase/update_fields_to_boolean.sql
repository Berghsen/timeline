-- Update niet_gewerkt, verlof, ziek to boolean and add bonnummer
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS bonnummer TEXT;

-- Convert existing text fields to boolean (if they exist as text)
-- First, drop the old columns if they exist
ALTER TABLE time_entries
DROP COLUMN IF EXISTS niet_gewerkt,
DROP COLUMN IF EXISTS verlof,
DROP COLUMN IF EXISTS ziek;

-- Add them back as boolean
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS niet_gewerkt BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verlof BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ziek BOOLEAN DEFAULT false;

