-- This script creates user_profiles for users that were manually created
-- but don't have profiles yet (in case the trigger didn't fire)

-- First, let's see which users don't have profiles
-- SELECT au.id, au.email, au.raw_user_meta_data
-- FROM auth.users au
-- LEFT JOIN public.user_profiles up ON au.id = up.id
-- WHERE up.id IS NULL;

-- Create profiles for users without profiles
-- Replace the role and full_name values as needed for each user
INSERT INTO public.user_profiles (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'employee') as role
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- If you need to manually set specific roles, you can do:
-- UPDATE public.user_profiles 
-- SET role = 'admin', full_name = 'Admin Name'
-- WHERE email = 'admin@example.com';

-- Or insert a specific user profile:
-- INSERT INTO public.user_profiles (id, email, full_name, role)
-- SELECT id, email, 'Full Name', 'employee'
-- FROM auth.users
-- WHERE email = 'user@example.com'
-- ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;

