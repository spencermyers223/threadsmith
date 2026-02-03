-- Add counter for total style profiles created (for free tier tracking)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS style_profiles_created INTEGER DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN profiles.style_profiles_created IS 'Total style profiles ever created by user (first 3 are free)';
