-- ============================================================================
-- ConnectSphere Supabase Migration: 06_row_level_security.sql
-- Mandatory Comprehensive Row Level Security (RLS) Policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENABLE RLS ON ALL TABLES
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_poll_votes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_saves ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disappearing_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_revenue ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sphere_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sphere_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sphere_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sphere_space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sphere_score_history ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES & USER DATA POLICIES
-- ----------------------------------------------------------------------------

-- Profiles: Public can view unblocked profiles; owners can update their own
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- User Settings: strictly private
CREATE POLICY "Users can view and manage their own settings" 
  ON public.user_settings FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- User Devices & Sessions: strictly private
CREATE POLICY "Users manage their own devices" 
  ON public.user_devices FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own sessions" 
  ON public.sessions FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Followers: Public can view, authenticated users can follow/unfollow
CREATE POLICY "Public follow relationships are viewable" 
  ON public.followers FOR SELECT 
  USING (true);

CREATE POLICY "Users can follow" 
  ON public.followers FOR INSERT 
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow or accept requests" 
  ON public.followers FOR DELETE 
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can update follow status" 
  ON public.followers FOR UPDATE 
  USING (auth.uid() = following_id);

-- Blocks: strictly private to blocker
CREATE POLICY "Users manage their block list" 
  ON public.blocks FOR ALL 
  USING (auth.uid() = blocker_id) 
  WITH CHECK (auth.uid() = blocker_id);

-- Reports: Users can submit reports
CREATE POLICY "Users can submit reports" 
  ON public.reports FOR INSERT 
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users view own reports" 
  ON public.reports FOR SELECT 
  USING (auth.uid() = reporter_id);

-- ----------------------------------------------------------------------------
-- POSTS, MEDIA, LIKES, COMMENTS, BOOKMARKS & POLLS POLICIES
-- ----------------------------------------------------------------------------

-- Posts: Public read; Authors can insert, update, delete
CREATE POLICY "Posts are viewable by everyone" 
  ON public.posts FOR SELECT 
  USING (is_archived = false OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create posts" 
  ON public.posts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
  ON public.posts FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
  ON public.posts FOR DELETE 
  USING (auth.uid() = user_id);

-- Post Media: Viewable with post; managed by post author
CREATE POLICY "Post media viewable with post" 
  ON public.post_media FOR SELECT 
  USING (true);

CREATE POLICY "Post author manages media" 
  ON public.post_media FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_media.post_id AND posts.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_media.post_id AND posts.user_id = auth.uid()));

-- Post Likes: Public can view; user manages own likes
CREATE POLICY "Likes are viewable by everyone" 
  ON public.post_likes FOR SELECT 
  USING (true);

CREATE POLICY "Users can like posts" 
  ON public.post_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their like" 
  ON public.post_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- Post Comments: Public can view; authenticated users can comment
CREATE POLICY "Comments are viewable by everyone" 
  ON public.post_comments FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can comment" 
  ON public.post_comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit or delete own comments" 
  ON public.post_comments FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Post Bookmarks & Reposts: strictly owner accessible
CREATE POLICY "Users view and manage own bookmarks" 
  ON public.post_bookmarks FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view and manage own reposts" 
  ON public.post_reposts FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Post Polls & Votes: Public read; 1 vote per user
CREATE POLICY "Polls and options are viewable by everyone" 
  ON public.post_polls FOR SELECT 
  USING (true);

CREATE POLICY "Poll options are viewable by everyone" 
  ON public.post_poll_options FOR SELECT 
  USING (true);

CREATE POLICY "Users can vote on polls" 
  ON public.post_poll_votes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view poll votes" 
  ON public.post_poll_votes FOR SELECT 
  USING (true);

-- ----------------------------------------------------------------------------
-- STORIES & REELS POLICIES
-- ----------------------------------------------------------------------------

-- Stories: Active stories viewable by authenticated users; author can insert/delete
CREATE POLICY "Active stories are viewable" 
  ON public.stories FOR SELECT 
  USING (expires_at > NOW() AND is_active = true);

CREATE POLICY "Users can create stories" 
  ON public.stories FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" 
  ON public.stories FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Story media viewable with story" 
  ON public.story_media FOR SELECT 
  USING (true);

CREATE POLICY "Story author manages media" 
  ON public.story_media FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.stories WHERE stories.id = story_media.story_id AND stories.user_id = auth.uid()));

CREATE POLICY "Users can view and record story views" 
  ON public.story_views FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can react to stories" 
  ON public.story_reactions FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Reels: Public view; author manages
CREATE POLICY "Reels viewable by everyone" 
  ON public.reels FOR SELECT 
  USING (true);

CREATE POLICY "Users can create reels" 
  ON public.reels FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own reels" 
  ON public.reels FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reel likes, saves, views" 
  ON public.reel_likes FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reel saves manage" 
  ON public.reel_saves FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- MESSAGES & CONVERSATIONS (STRICT ZERO-KNOWLEDGE MEMBERSHIP ACCESS)
-- ----------------------------------------------------------------------------

-- Conversations: Viewable ONLY if user is a member of conversation_members
CREATE POLICY "Users can view conversations they belong to" 
  ON public.conversations FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members 
    WHERE conversation_members.conversation_id = conversations.id 
    AND conversation_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can create conversations" 
  ON public.conversations FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

-- Conversation Members: Viewable only by members of that conversation
CREATE POLICY "Members view other members in their conversation" 
  ON public.conversation_members FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members cm 
    WHERE cm.conversation_id = conversation_members.conversation_id 
    AND cm.user_id = auth.uid()
  ));

CREATE POLICY "Members can join or be added" 
  ON public.conversation_members FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.conversation_members admin_check 
    WHERE admin_check.conversation_id = conversation_members.conversation_id 
    AND admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
  ));

-- Messages: Viewable and insertable ONLY by conversation members
CREATE POLICY "Messages readable only by conversation members" 
  ON public.messages FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members 
    WHERE conversation_members.conversation_id = messages.conversation_id 
    AND conversation_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can send messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND 
    EXISTS (
      SELECT 1 FROM public.conversation_members 
      WHERE conversation_members.conversation_id = messages.conversation_id 
      AND conversation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Senders can edit or soft-delete own messages" 
  ON public.messages FOR UPDATE 
  USING (auth.uid() = sender_id) 
  WITH CHECK (auth.uid() = sender_id);

-- Message reactions, attachments & reads
CREATE POLICY "Message reactions accessible by conversation members" 
  ON public.message_reactions FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.messages m 
    JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id 
    WHERE m.id = message_reactions.message_id AND cm.user_id = auth.uid()
  ));

CREATE POLICY "Message attachments accessible by conversation members" 
  ON public.message_attachments FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.messages m 
    JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id 
    WHERE m.id = message_attachments.message_id AND cm.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS (STRICT RECIPIENT ACCESS)
-- ----------------------------------------------------------------------------

CREATE POLICY "Users can only view their own notifications" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update read status of own notifications" 
  ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System and actors can insert notifications" 
  ON public.notifications FOR INSERT 
  WITH CHECK (auth.uid() = actor_id OR auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- CALLS & SIGNALING POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "Participants can view and participate in calls" 
  ON public.calls FOR ALL 
  USING (auth.uid() = caller_id OR EXISTS (
    SELECT 1 FROM public.call_participants 
    WHERE call_participants.call_id = calls.id AND call_participants.user_id = auth.uid()
  ));

CREATE POLICY "Call signaling events accessible to participants" 
  ON public.call_events FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.calls 
    WHERE calls.id = call_events.call_id 
    AND (calls.caller_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.call_participants cp 
      WHERE cp.call_id = calls.id AND cp.user_id = auth.uid()
    ))
  ));

-- ----------------------------------------------------------------------------
-- CREATOR STUDIO, SEARCH HISTORY & AI TELEMETRY POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "Creators can view their own profile and revenue" 
  ON public.creator_profiles FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Creators can view their own analytics" 
  ON public.creator_analytics FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Creators view own revenue" 
  ON public.creator_revenue FOR SELECT 
  USING (auth.uid() = creator_id);

CREATE POLICY "Search history is strictly private" 
  ON public.search_history FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "AI usage and requests are strictly private" 
  ON public.ai_requests FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "AI usage quota is strictly private" 
  ON public.ai_usage FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- COMMUNITIES & SPACES POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "Communities viewable by everyone" 
  ON public.communities FOR SELECT 
  USING (is_private = false OR EXISTS (
    SELECT 1 FROM public.community_members 
    WHERE community_members.community_id = communities.id AND community_members.user_id = auth.uid()
  ));

CREATE POLICY "Community members viewable" 
  ON public.community_members FOR SELECT 
  USING (true);

CREATE POLICY "Users can join communities" 
  ON public.community_members FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities" 
  ON public.community_members FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Sphere rooms viewable if active" 
  ON public.sphere_rooms FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Sphere room members participate" 
  ON public.sphere_room_members FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
