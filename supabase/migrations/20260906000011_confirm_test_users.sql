-- ============================================================================
-- ConnectSphere Supabase Migration: 11_confirm_test_users.sql
-- Confirms test user email for automated verification
-- ============================================================================

-- 1. Confirm any registered test accounts
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email LIKE '%@connectsphere.internal' OR email LIKE 'alex_test_%@gmail.com' OR email LIKE 'test_%@gmail.com';

-- 2. Create helper function to safely confirm demo users
CREATE OR REPLACE FUNCTION public.confirm_user_by_email(target_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE email = target_email;
  RETURN FOUND;
END;
$$;
