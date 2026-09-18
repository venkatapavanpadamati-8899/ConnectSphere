-- ============================================================================
-- ConnectSphere Supabase Migration: 19_fix_following_view_security.sql
-- Fixes public.following view to use security_invoker to respect RLS
-- ============================================================================

DO $$
BEGIN
    -- Check if the view exists before altering to ensure idempotency
    IF EXISTS (
        SELECT 1
        FROM pg_views
        WHERE schemaname = 'public' AND viewname = 'following'
    ) THEN
        ALTER VIEW public.following SET (security_invoker = true);
    END IF;
END $$;
