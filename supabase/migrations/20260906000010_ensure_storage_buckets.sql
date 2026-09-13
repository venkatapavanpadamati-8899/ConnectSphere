-- ============================================================================
-- ConnectSphere Supabase Migration: 10_ensure_storage_buckets.sql
-- Ensure Storage Buckets & Allow Bucket Discovery Policy
-- ============================================================================

-- Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('post-media', 'post-media', true, 104857600, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav']),
  ('story-media', 'story-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('reel-media', 'reel-media', true, 209715200, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
  ('video-media', 'video-media', true, 1073741824, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']),
  ('message-media', 'message-media', false, 104857600, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/wav', 'application/pdf']),
  ('attachments', 'attachments', false, 104857600, ARRAY['application/pdf', 'application/zip', 'text/plain', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow public and authenticated discovery of public buckets
DROP POLICY IF EXISTS "Allow public bucket discovery" ON storage.buckets;
CREATE POLICY "Allow public bucket discovery" 
  ON storage.buckets FOR SELECT 
  USING (true);
