-- Create storage bucket for vendor logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-logos', 'vendor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for vendor logos
CREATE POLICY "Anyone can view vendor logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'vendor-logos');

CREATE POLICY "Authenticated users can upload vendor logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vendor-logos');

CREATE POLICY "Users can update their own vendor logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vendor-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own vendor logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'vendor-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
