-- ============================================================================
-- ConnectSphere Supabase Migration: 03_stories_reels_videos.sql
-- 24h Stories, Reels Short-Form, Long-Form Video Theater & Channels
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STORIES SECTION
-- ----------------------------------------------------------------------------

-- 1. Stories Table
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Story Media Slides Table
CREATE TABLE IF NOT EXISTS public.story_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'text')),
  media_url TEXT,
  text_content TEXT,
  bg_gradient TEXT DEFAULT 'linear-gradient(135deg, #00D2FF 0%, #7357FF 100%)',
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Story Views Table
CREATE TABLE IF NOT EXISTS public.story_views (
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  slide_id UUID NOT NULL REFERENCES public.story_media(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (slide_id, user_id)
);

-- 4. Story Reactions Table
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  slide_id UUID NOT NULL REFERENCES public.story_media(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Story Replies Table
CREATE TABLE IF NOT EXISTS public.story_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Story Highlights Table
CREATE TABLE IF NOT EXISTS public.story_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- REELS SHORT-FORM SECTION
-- ----------------------------------------------------------------------------

-- 7. Reels Table
CREATE TABLE IF NOT EXISTS public.reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption TEXT NOT NULL DEFAULT '',
  sound_title TEXT DEFAULT 'Original Audio &bull; ConnectSphere Spatial Engine',
  views_count BIGINT DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Reel Media Table
CREATE TABLE IF NOT EXISTS public.reel_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID UNIQUE NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  poster_url TEXT,
  aspect_ratio TEXT DEFAULT '9:16',
  duration_seconds NUMERIC DEFAULT 15.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Reel Likes Table
CREATE TABLE IF NOT EXISTS public.reel_likes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, reel_id)
);

-- 10. Reel Comments Table
CREATE TABLE IF NOT EXISTS public.reel_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Reel Views Table
CREATE TABLE IF NOT EXISTS public.reel_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  watch_duration_seconds NUMERIC DEFAULT 0,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Reel Saves Table
CREATE TABLE IF NOT EXISTS public.reel_saves (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, reel_id)
);

-- ----------------------------------------------------------------------------
-- LONG-FORM VIDEO THEATER & CHANNELS SECTION
-- ----------------------------------------------------------------------------

-- 13. Channels Table
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  channel_handle TEXT UNIQUE NOT NULL,
  banner_url TEXT,
  subscribers_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Channel Subscribers Table
CREATE TABLE IF NOT EXISTS public.channel_subscribers (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, channel_id)
);

-- 15. Videos Table (Long-form Stream / Theater)
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  views_count BIGINT DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Video Media Table
CREATE TABLE IF NOT EXISTS public.video_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID UNIQUE NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  resolution TEXT DEFAULT '1080p',
  manifest_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Video Comments Table (Live Stream & VOD Discussion)
CREATE TABLE IF NOT EXISTS public.video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Video Likes Table
CREATE TABLE IF NOT EXISTS public.video_likes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- 19. Video Views Table
CREATE TABLE IF NOT EXISTS public.video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON public.reels(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON public.reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON public.videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_subs_channel ON public.channel_subscribers(channel_id);
