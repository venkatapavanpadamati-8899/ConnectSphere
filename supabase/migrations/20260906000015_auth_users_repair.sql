-- ============================================================================
-- ConnectSphere Supabase Migration: 15_auth_users_repair.sql
-- Repairs missing NOT NULL / DEFAULT fields for manually inserted demo accounts.
-- ============================================================================

-- Fix NULL fields for manually inserted users which cause GoTrue 500 errors
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  phone_change = COALESCE(phone_change, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
  is_sso_user = COALESCE(is_sso_user, false),
  is_super_admin = COALESCE(is_super_admin, false)
WHERE email IN ('creator@connectsphere.com', 'explorer@connectsphere.com');
