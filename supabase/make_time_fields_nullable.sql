-- Make start_time and end_time nullable to allow status-only entries
ALTER TABLE time_entries
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;

