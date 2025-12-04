-- Fix infinite recursion in RLS policies
-- This script drops the problematic policies and recreates them with a SECURITY DEFINER function

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all time entries" ON time_entries;

-- Create a SECURITY DEFINER function to check if user is admin
-- This bypasses RLS when checking admin status, preventing recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the admin policy for user_profiles using the function
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.is_admin());

-- Recreate the admin policy for time_entries using the function
CREATE POLICY "Admins can view all time entries"
  ON time_entries
  FOR SELECT
  USING (public.is_admin());

