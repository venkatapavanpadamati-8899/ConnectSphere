-- ============================================================================
-- ConnectSphere Supabase Migration: 12_seed_demo_accounts.sql
-- Provisions confirmed production demo accounts:
-- creator@connectsphere.com / SpherePassword2026!
-- explorer@connectsphere.com / SpherePassword2026!
-- ============================================================================

DO $$
DECLARE
  creator_id uuid := 'a1111111-1111-1111-1111-111111111111';
  explorer_id uuid := 'b2222222-2222-2222-2222-222222222222';
BEGIN
  -- Insert Creator
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'creator@connectsphere.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      creator_id,
      'authenticated',
      'authenticated',
      'creator@connectsphere.com',
      extensions.crypt('SpherePassword2026!', extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Alex Johnson","username":"alexjohnson","role":"Verified Creator"}',
      NOW(),
      NOW()
    );
  ELSE
    UPDATE auth.users 
    SET 
      encrypted_password = extensions.crypt('SpherePassword2026!', extensions.gen_salt('bf')),
      email_confirmed_at = NOW()
    WHERE email = 'creator@connectsphere.com';
  END IF;

  -- Insert Explorer
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'explorer@connectsphere.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      explorer_id,
      'authenticated',
      'authenticated',
      'explorer@connectsphere.com',
      extensions.crypt('SpherePassword2026!', extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Sofia Chen","username":"sofiachen","role":"AI Systems Researcher"}',
      NOW(),
      NOW()
    );
  ELSE
    UPDATE auth.users 
    SET 
      encrypted_password = extensions.crypt('SpherePassword2026!', extensions.gen_salt('bf')),
      email_confirmed_at = NOW()
    WHERE email = 'explorer@connectsphere.com';
  END IF;
END $$;
