-- ============================================================================
-- ConnectSphere Supabase Migration: 13_rls_refinements.sql
-- Fix RLS for post_polls, post_poll_options, reel_media, and conversations
-- ============================================================================

-- 1. Post Polls author management
DROP POLICY IF EXISTS "Post author manages post polls" ON public.post_polls;
CREATE POLICY "Post author manages post polls" 
  ON public.post_polls FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_polls.post_id AND posts.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_polls.post_id AND posts.user_id = auth.uid()));

-- 2. Post Poll Options author management
DROP POLICY IF EXISTS "Post author manages poll options" ON public.post_poll_options;
CREATE POLICY "Post author manages poll options" 
  ON public.post_poll_options FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.post_polls 
    JOIN public.posts ON posts.id = post_polls.post_id 
    WHERE post_polls.id = post_poll_options.poll_id AND posts.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.post_polls 
    JOIN public.posts ON posts.id = post_polls.post_id 
    WHERE post_polls.id = post_poll_options.poll_id AND posts.user_id = auth.uid()
  ));

-- 3. Reel Media viewable and manageable
DROP POLICY IF EXISTS "Reel media viewable with reel" ON public.reel_media;
CREATE POLICY "Reel media viewable with reel" 
  ON public.reel_media FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Reel author manages media" ON public.reel_media;
CREATE POLICY "Reel author manages media" 
  ON public.reel_media FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.reels WHERE reels.id = reel_media.reel_id AND reels.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reels WHERE reels.id = reel_media.reel_id AND reels.user_id = auth.uid()));

-- 4. Conversations SELECT policy for creator + members
DROP POLICY IF EXISTS "Users can view conversations they belong to" ON public.conversations;
CREATE POLICY "Users can view conversations they belong to" 
  ON public.conversations FOR SELECT 
  USING (
    created_by = auth.uid() OR 
    is_conversation_member(conversations.id, auth.uid())
  );
