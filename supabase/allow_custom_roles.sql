-- Allow custom roles in user_profiles table
-- This removes the CHECK constraint that limits roles to 'employee' and 'admin'
-- Note: 'admin' role will still grant admin privileges, but you can use any custom role name

-- Drop the existing CHECK constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Now you can set any role value you want
-- Examples:
-- UPDATE user_profiles SET role = 'Manager' WHERE email = 'manager@example.com';
-- UPDATE user_profiles SET role = 'Supervisor' WHERE email = 'supervisor@example.com';
-- UPDATE user_profiles SET role = 'Intern' WHERE email = 'intern@example.com';
-- UPDATE user_profiles SET role = 'Contractor' WHERE email = 'contractor@example.com';

-- IMPORTANT NOTES:
-- 1. The role 'admin' is special - only users with role = 'admin' will have admin dashboard access
-- 2. All other roles (including 'employee' and custom roles) will use the employee dashboard
-- 3. Admin privileges (viewing all employees, managing time entries) are only for role = 'admin'
-- 4. Custom role names will be displayed as-is in the sidebar (e.g., "Manager", "Supervisor", etc.)

