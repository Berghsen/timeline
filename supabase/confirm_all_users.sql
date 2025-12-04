-- Confirm all existing users (run this if you disabled email confirmation)
-- This sets the email_confirmed_at timestamp for all users that don't have it

UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- Verify the update
SELECT id, email, email_confirmed_at 
FROM auth.users 
ORDER BY created_at DESC;

