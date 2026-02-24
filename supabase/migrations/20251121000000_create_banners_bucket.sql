-- Create storage bucket for banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for banner images with IF NOT EXISTS to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view banner images') THEN
    CREATE POLICY "Anyone can view banner images"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'banners');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin users can upload banner images') THEN
    CREATE POLICY "Admin users can upload banner images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'banners' 
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin users can update banner images') THEN
    CREATE POLICY "Admin users can update banner images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'banners' 
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin users can delete banner images') THEN
    CREATE POLICY "Admin users can delete banner images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'banners' 
        AND EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role = 'admin'
        )
      );
  END IF;
END $$;