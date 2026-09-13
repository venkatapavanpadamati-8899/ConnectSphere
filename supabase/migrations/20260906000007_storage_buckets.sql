-- ============================================================================
-- ConnectSphere Supabase Migration: 07_storage_buckets.sql
-- Supabase Storage Buckets & Storage Row Level Security Policies
-- ============================================================================

-- Create storage buckets
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

-- ----------------------------------------------------------------------------
-- STORAGE POLICIES (storage.objects)
-- ----------------------------------------------------------------------------

-- Avatars: Public read, authenticated users can upload to their own folder
CREATE POLICY "Public can view avatar images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update or delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Post Media: Public read, authenticated users can upload
CREATE POLICY "Public can view post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "Authenticated users can upload post media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Story Media: Public read, owner upload
CREATE POLICY "Public can view story media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-media');

CREATE POLICY "Authenticated users can upload story media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'story-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Reel Media: Public read, owner upload
CREATE POLICY "Public can view reel media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reel-media');

CREATE POLICY "Authenticated users can upload reel media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reel-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Video Media (Long-form): Public read, channel owner upload
CREATE POLICY "Public can view video media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video-media');

CREATE POLICY "Authenticated users can upload long-form videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'video-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Private Message Media: strictly accessible only to conversation participants
CREATE POLICY "Users can access message media for their conversations"
  ON storage.objects FOR SELECT
  USING (
    bucket_id IN ('message-media', 'attachments')
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.conversation_members cm
        JOIN public.messages m ON m.conversation_id = cm.conversation_id
        JOIN public.message_attachments ma ON ma.message_id = m.id
        WHERE cm.user_id = auth.uid()
        AND ma.file_url LIKE '%' || storage.objects.name || '%'
      )
    )
  );

CREATE POLICY "Users can upload message media to own user folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('message-media', 'attachments')
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
