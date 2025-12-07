-- Update user role in Supabase
-- This script shows how to change a user's role to any custom role name

-- IMPORTANT: First run allow_custom_roles.sql to remove the role constraint

-- Example 1: Change a specific user to admin by email
-- UPDATE user_profiles
-- SET role = 'admin'
-- WHERE email = 'user@example.com';

-- Example 2: Change a specific user to employee by email
-- UPDATE user_profiles
-- SET role = 'employee'
-- WHERE email = 'user@example.com';

-- Example 3: Set a custom role (e.g., Manager)
-- UPDATE user_profiles
-- SET role = 'Manager'
-- WHERE email = 'manager@example.com';

-- Example 4: Set a custom role (e.g., Supervisor)
-- UPDATE user_profiles
-- SET role = 'Supervisor'
-- WHERE email = 'supervisor@example.com';

-- Example 5: Set a custom role (e.g., Intern)
-- UPDATE user_profiles
-- SET role = 'Intern'
-- WHERE email = 'intern@example.com';

-- Example 6: Change a user to admin by user ID (UUID)
-- UPDATE user_profiles
-- SET role = 'admin'
-- WHERE id = '00000000-0000-0000-0000-000000000000';

-- Example 7: View all users and their current roles
-- SELECT id, email, full_name, role, created_at
-- FROM user_profiles
-- ORDER BY created_at DESC;

-- Example 8: View only admins
-- SELECT id, email, full_name, role
-- FROM user_profiles
-- WHERE role = 'admin';

-- Example 9: View users with a specific custom role
-- SELECT id, email, full_name, role
-- FROM user_profiles
-- WHERE role = 'Manager';

-- IMPORTANT NOTES:
-- 1. After running allow_custom_roles.sql, you can set ANY role name you want
-- 2. The role 'admin' is special - only users with role = 'admin' will have admin dashboard access
-- 3. All other roles (including 'employee' and custom roles) will use the employee dashboard
-- 4. Custom role names will be displayed as-is in the sidebar (e.g., "Manager", "Supervisor", "Intern")
-- 5. After updating a role, the user needs to log out and log back in for changes to take effect
-- 6. Admins can see all employee time entries and manage employees
-- 7. Non-admin users can only see and manage their own time entries

