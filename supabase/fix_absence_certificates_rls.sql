-- Fix RLS policies for absence_certificates
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own certificates" ON absence_certificates;
DROP POLICY IF EXISTS "Users can insert own certificates" ON absence_certificates;
DROP POLICY IF EXISTS "Users can update own certificates" ON absence_certificates;
DROP POLICY IF EXISTS "Users can delete own certificates" ON absence_certificates;
DROP POLICY IF EXISTS "Admins can view all certificates" ON absence_certificates;

-- Recreate policies
-- Users can view their own certificates
CREATE POLICY "Users can view own certificates"
  ON absence_certificates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own certificates
CREATE POLICY "Users can insert own certificates"
  ON absence_certificates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own certificates
CREATE POLICY "Users can update own certificates"
  ON absence_certificates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own certificates
CREATE POLICY "Users can delete own certificates"
  ON absence_certificates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all certificates
CREATE POLICY "Admins can view all certificates"
  ON absence_certificates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

