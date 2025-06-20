-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images', 
  'images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Create storage policies
CREATE POLICY "Anyone can upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images');

CREATE POLICY "Anyone can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Anyone can update images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'images');

CREATE POLICY "Anyone can delete images" ON storage.objects
  FOR DELETE USING (bucket_id = 'images');
