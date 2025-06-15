-- Drop table if it exists (for clean setup)
DROP TABLE IF EXISTS public.braids;

-- Create braids table for storing braid submissions
CREATE TABLE public.braids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  braid_name TEXT NOT NULL,
  alt_names TEXT,
  region TEXT NOT NULL,
  image_url TEXT,
  public_url TEXT,
  contributor_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.braids ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read braids
CREATE POLICY "Anyone can view braids" ON public.braids
  FOR SELECT USING (true);

-- Create policy to allow anyone to insert braids
CREATE POLICY "Anyone can insert braids" ON public.braids
  FOR INSERT WITH CHECK (true);

-- Create storage bucket for images (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for storage bucket
CREATE POLICY "Anyone can upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images');

CREATE POLICY "Anyone can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');
