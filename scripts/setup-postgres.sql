-- Simple PostgreSQL setup for braids
CREATE TABLE IF NOT EXISTS braids (
  id SERIAL PRIMARY KEY,
  braid_name VARCHAR(255) NOT NULL,
  alt_names TEXT,
  region VARCHAR(255) NOT NULL,
  image_url TEXT,
  public_url TEXT,
  contributor_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample data
INSERT INTO braids (braid_name, alt_names, region, contributor_name) VALUES
('Box Braids', 'Square Braids', 'West Africa', 'Cultural Team'),
('French Braid', 'Tresse Française', 'Europe', 'Heritage Docs'),
('Cornrows', 'Canerows', 'Africa', 'Traditional Styles')
ON CONFLICT DO NOTHING;
