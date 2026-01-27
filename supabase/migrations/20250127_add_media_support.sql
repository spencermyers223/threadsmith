-- Add media column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for post media
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('post-media', 'post-media', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to post-media bucket
CREATE POLICY "Public read access for post-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

-- Allow authenticated users to upload to post-media
CREATE POLICY "Authenticated users can upload to post-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-media');

-- Allow authenticated users to delete from post-media
CREATE POLICY "Authenticated users can delete from post-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-media');
