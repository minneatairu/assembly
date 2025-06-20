-- Create users table for account management
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_id to braids table to associate submissions with users
ALTER TABLE braids 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_braids_user_id ON braids(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
