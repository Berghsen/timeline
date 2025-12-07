-- Create absence_certificates table
CREATE TABLE IF NOT EXISTS absence_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  comment TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CHECK (end_date >= start_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_absence_certificates_user_id ON absence_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_absence_certificates_dates ON absence_certificates(start_date, end_date);

-- Enable Row Level Security
ALTER TABLE absence_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for absence_certificates
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
  USING (auth.uid() = user_id);

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

