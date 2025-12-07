-- Create storage bucket for absence certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('absence-certificates', 'absence-certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for absence-certificates bucket
-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload own certificates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'absence-certificates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own files
CREATE POLICY "Users can read own certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'absence-certificates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own certificates"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'absence-certificates' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to read all files
CREATE POLICY "Admins can read all certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'absence-certificates' AND
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

