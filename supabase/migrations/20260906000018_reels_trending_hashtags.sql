-- ============================================================================
-- ConnectSphere Supabase Migration: 18_reels_trending_hashtags.sql
-- Computes trending hashtags securely using real reels data.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_trending_hashtags(limit_count INT DEFAULT 10)
RETURNS TABLE (
    hashtag TEXT,
    trend_score NUMERIC,
    reel_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH extracted AS (
    -- Extract distinct lowercased hashtags per reel within the last 30 days
    SELECT 
      r.id as reel_id,
      LOWER((regexp_matches(r.caption, '#([a-zA-Z0-9_]+)', 'g'))[1]) AS hashtag,
      r.created_at,
      r.likes_count,
      r.comments_count,
      r.views_count,
      r.saves_count
    FROM public.reels r
    WHERE r.created_at > (NOW() - INTERVAL '30 days')
  ),
  distinct_per_reel AS (
    -- Deduplicate so multiple identical tags in one reel count only once for frequency
    SELECT DISTINCT reel_id, hashtag, created_at, likes_count, comments_count, views_count, saves_count
    FROM extracted
  )
  SELECT 
    hashtag,
    -- Formula: (Frequency * 10) + Engagement + Recentness Bonus
    -- Engagement: likes + comments + saves + (views * 0.1)
    -- Recentness: max 10 points for brand new reels, decaying over days
    ROUND(
      (COUNT(reel_id) * 10.0) +
      SUM(likes_count + comments_count + saves_count + (views_count * 0.1)) +
      (10.0 / (EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 86400.0 + 1.0))
    , 2) AS trend_score,
    COUNT(reel_id) AS reel_count
  FROM distinct_per_reel
  GROUP BY hashtag
  ORDER BY trend_score DESC
  LIMIT limit_count;
$$;

-- Grant execute to authenticated and anon users (they can view trending)
GRANT EXECUTE ON FUNCTION get_trending_hashtags(INT) TO authenticated, anon;
