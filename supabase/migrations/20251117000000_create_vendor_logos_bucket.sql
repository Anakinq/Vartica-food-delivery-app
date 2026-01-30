-- Create storage bucket for vendor logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-logos', 'vendor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for vendor logos (with IF NOT EXISTS to prevent duplicates)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view vendor logos') THEN
    CREATE POLICY "Anyone can view vendor logos"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'vendor-logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload vendor logos') THEN
    CREATE POLICY "Authenticated users can upload vendor logos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'vendor-logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own vendor logos') THEN
    CREATE POLICY "Users can update their own vendor logos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'vendor-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own vendor logos') THEN
    CREATE POLICY "Users can delete their own vendor logos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'vendor-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
