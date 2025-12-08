-- Add title column to absence_certificates table
ALTER TABLE absence_certificates
ADD COLUMN IF NOT EXISTS title TEXT;

