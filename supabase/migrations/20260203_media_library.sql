-- Media Library Tables
-- Standalone media storage for users, independent of posts

-- Media folders for organization
CREATE TABLE IF NOT EXISTS media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user's folders
CREATE INDEX IF NOT EXISTS idx_media_folders_user_id ON media_folders(user_id);

-- RLS for media_folders
ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own media folders"
  ON media_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own media folders"
  ON media_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media folders"
  ON media_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media folders"
  ON media_folders FOR DELETE
  USING (auth.uid() = user_id);

-- User media library
CREATE TABLE IF NOT EXISTS user_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  type TEXT NOT NULL, -- 'image/jpeg', 'video/mp4', etc.
  size INTEGER NOT NULL, -- bytes
  width INTEGER, -- for images/videos
  height INTEGER, -- for images/videos
  storage_path TEXT NOT NULL, -- path in Supabase storage
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for user_media
CREATE INDEX IF NOT EXISTS idx_user_media_user_id ON user_media(user_id);
CREATE INDEX IF NOT EXISTS idx_user_media_folder_id ON user_media(folder_id);
CREATE INDEX IF NOT EXISTS idx_user_media_type ON user_media(user_id, type);
CREATE INDEX IF NOT EXISTS idx_user_media_created_at ON user_media(user_id, created_at DESC);

-- RLS for user_media
ALTER TABLE user_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own media"
  ON user_media FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own media"
  ON user_media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media"
  ON user_media FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
  ON user_media FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for user media library (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-media', 'user-media', true, 52428800) -- 50MB limit
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user-media bucket
CREATE POLICY "Public read access for user-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-media');

CREATE POLICY "Authenticated users can upload to user-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own user-media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own user-media"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);
