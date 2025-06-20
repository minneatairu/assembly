-- Create braids table for storing braid submissions
CREATE TABLE IF NOT EXISTS public.braids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  braid_name TEXT NOT NULL,
  alt_names TEXT,
  region TEXT NOT NULL,
  image_url TEXT,
  public_url TEXT,
  contributor_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_braids_updated_at 
    BEFORE UPDATE ON public.braids 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.braids ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view braids" ON public.braids
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert braids" ON public.braids
  FOR INSERT WITH CHECK (true);

-- Optional: Allow updates (for future moderation features)
CREATE POLICY "Anyone can update braids" ON public.braids
  FOR UPDATE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_braids_created_at ON public.braids(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_braids_region ON public.braids(region);
CREATE INDEX IF NOT EXISTS idx_braids_braid_name ON public.braids(braid_name);
