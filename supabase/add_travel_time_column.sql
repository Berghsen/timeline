-- Add travel_time_minutes column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS travel_time_minutes INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN user_profiles.travel_time_minutes IS 'Travel time in minutes to be deducted from daily work hours';

