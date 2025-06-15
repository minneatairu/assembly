-- Create braids table for storing braid submissions
CREATE TABLE IF NOT EXISTS braids (
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
ALTER TABLE braids ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read braids
CREATE POLICY "Anyone can view braids" ON braids
  FOR SELECT USING (true);

-- Create policy to allow anyone to insert braids
CREATE POLICY "Anyone can insert braids" ON braids
  FOR INSERT WITH CHECK (true);
