-- Add braid_patterns column to braids table
ALTER TABLE braids ADD COLUMN IF NOT EXISTS braid_patterns JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN braids.braid_patterns IS 'Array of braid pattern types (curve, s-curve, c-curve, j-curve, u-curve, zigzag, spiral, criss-cross, chevron, heart-shaped, wavy, diamond-grid)';
