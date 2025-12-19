-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for menu images
CREATE POLICY "Anyone can view menu images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'menu-images');

CREATE POLICY "Authenticated users can upload menu images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Users can update their own menu images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own menu images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'menu-images' AND auth.uid()::text = (storage.foldername(name))[1]);
