-- ============================================================================
-- ConnectSphere Supabase Migration: 05_ecosystem_features.sql
-- Communities, Notifications, Creator Studio, AI Telemetry, Spaces & Ecosystem
-- ============================================================================

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS SECTION
-- ----------------------------------------------------------------------------

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'reply', 'follow', 'message', 'mention', 'story_reaction', 'story_reply', 'community', 'creator')),
  resource_id TEXT,
  resource_type TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- COMMUNITIES SECTION
-- ----------------------------------------------------------------------------

-- 2. Communities Table
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  avatar_url TEXT,
  banner_url TEXT,
  category TEXT DEFAULT 'technology',
  members_count INTEGER DEFAULT 1,
  posts_count INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Community Members Table
CREATE TABLE IF NOT EXISTS public.community_members (
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (community_id, user_id)
);

-- 4. Community Posts Link Table
CREATE TABLE IF NOT EXISTS public.community_posts (
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (community_id, post_id)
);

-- ----------------------------------------------------------------------------
-- CREATOR STUDIO & REVENUE SECTION
-- ----------------------------------------------------------------------------

-- 5. Creator Profiles Table
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT DEFAULT 'verified_creator' CHECK (tier IN ('standard', 'verified_creator', 'vip_spatial', 'genesis_partner')),
  payout_address TEXT,
  total_revenue_usd NUMERIC DEFAULT 0.00,
  subscribers_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Creator Analytics Table (Daily/Monthly aggregated metrics)
CREATE TABLE IF NOT EXISTS public.creator_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  reach BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  profile_visits INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_daily_analytics UNIQUE (user_id, date_recorded)
);

-- 7. Creator Revenue Transactions Table
CREATE TABLE IF NOT EXISTS public.creator_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_usd NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'tip', 'spatial_token', 'marketplace_cut')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- SEARCH & AI TELEMETRY SECTION
-- ----------------------------------------------------------------------------

-- 8. Search History Table
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  category TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AI Requests Table (Telemetry & prompt audits)
CREATE TABLE IF NOT EXISTS public.ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('caption', 'hashtag', 'insights', 'translation', 'moderation')),
  prompt TEXT NOT NULL,
  response_summary TEXT,
  latency_ms INTEGER,
  model_used TEXT DEFAULT 'gemini-1.5-flash',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AI Usage Table (Token & quota tracking)
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_estimate_usd NUMERIC DEFAULT 0.0000,
  billing_period_start DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- LIVE STREAMS & EVENTS SECTION
-- ----------------------------------------------------------------------------

-- 11. Live Streams Table
CREATE TABLE IF NOT EXISTS public.live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stream_key TEXT UNIQUE NOT NULL,
  playback_url TEXT,
  status TEXT DEFAULT 'live' CHECK (status IN ('scheduled', 'live', 'ended')),
  current_viewers_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- 12. Live Viewers Presence Table
CREATE TABLE IF NOT EXISTS public.live_viewers (
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (stream_id, user_id)
);

-- 13. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_time TIMESTAMPTZ NOT NULL,
  location TEXT DEFAULT 'ConnectSphere Spatial Auditorium',
  is_virtual BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Event Members Table
CREATE TABLE IF NOT EXISTS public.event_members (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'attending' CHECK (status IN ('attending', 'interested', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- ----------------------------------------------------------------------------
-- MARKETPLACE & JOBS SECTION
-- ----------------------------------------------------------------------------

-- 15. Marketplace Items Table
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_usd NUMERIC NOT NULL,
  media_url TEXT NOT NULL,
  category TEXT DEFAULT 'digital_assets',
  is_sold BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Marketplace Interactions Table
CREATE TABLE IF NOT EXISTS public.marketplace_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('inquiry', 'offer', 'purchase', 'bookmark')),
  amount_usd NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Jobs Board Table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  description TEXT NOT NULL,
  compensation_range TEXT,
  location_type TEXT DEFAULT 'remote' CHECK (location_type IN ('remote', 'hybrid', 'onsite')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Job Applications Table
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  portfolio_url TEXT,
  cover_note TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'interviewing', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_applicant_job UNIQUE (job_id, applicant_id)
);

-- ----------------------------------------------------------------------------
-- SPATIAL ROOMS, SPACES & SCORE SECTION
-- ----------------------------------------------------------------------------

-- 19. Sphere Rooms Table (Spatial Audio & 3D WebAssembly rooms)
CREATE TABLE IF NOT EXISTS public.sphere_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_mesh_url TEXT,
  max_occupants INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Sphere Room Members Table
CREATE TABLE IF NOT EXISTS public.sphere_room_members (
  room_id UUID NOT NULL REFERENCES public.sphere_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_speaking BOOLEAN DEFAULT false,
  spatial_position JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- 21. Sphere Spaces Table (Curated thematic digital environments)
CREATE TABLE IF NOT EXISTS public.sphere_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  environment_preset TEXT DEFAULT 'tokyo_neon' CHECK (environment_preset IN ('tokyo_neon', 'orbital_mesh', 'cyber_glass', 'nordic_solitude')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Sphere Space Members Table
CREATE TABLE IF NOT EXISTS public.sphere_space_members (
  space_id UUID NOT NULL REFERENCES public.sphere_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (space_id, user_id)
);

-- 23. Sphere Score History Table (Reputation & decentralized trust score)
CREATE TABLE IF NOT EXISTS public.sphere_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  score_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communities_slug ON public.communities(slug);
CREATE INDEX IF NOT EXISTS idx_comm_members_user ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_analytics_user ON public.creator_analytics(user_id, date_recorded DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON public.search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_user ON public.ai_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sphere_rooms_active ON public.sphere_rooms(is_active);
