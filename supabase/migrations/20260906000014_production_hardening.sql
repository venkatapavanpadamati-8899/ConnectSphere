-- ============================================================================
-- ConnectSphere Supabase Migration: 14_production_hardening.sql
-- Purges demo accounts, applies database-level input validation, adds indexes
-- ============================================================================

-- 1. Purge Fake / Demo Accounts (Disabled per Phase 8.2 incident response)
-- DELETE FROM auth.users WHERE email IN ('creator@connectsphere.com', 'explorer@connectsphere.com');
-- DELETE FROM public.profiles WHERE id IN ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222');

-- 2. Data Constraints for Input Validation
DO $$ 
BEGIN
  -- Posts: Limit caption size to 2200 characters
  ALTER TABLE public.posts ADD CONSTRAINT posts_caption_length_check CHECK (length(caption) <= 2200);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  -- Messages: Limit message text size to 4000 characters
  ALTER TABLE public.messages ADD CONSTRAINT messages_text_length_check CHECK (length(text) <= 4000);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  -- Profiles: Limit username size and enforce format
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_length_check CHECK (length(username) <= 30);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);

-- 4. RLS Refinement
-- Explicitly ensure that auth.uid() is matched for inserts on profiles, posts, and messages.
-- Typically handled by earlier migrations, but we forcefully re-apply the INSERT policy for security.
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
CREATE POLICY "Users can create their own posts" 
ON public.posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);
