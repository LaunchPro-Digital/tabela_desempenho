-- Migration: Auth Migration for Supabase Auth Integration
-- Story 1.2 - Supabase Auth + Primeiro Acesso
-- Run this in the Supabase SQL Editor (schema: desempenho)

-- ============================================================
-- 1. Add new columns to app_users
-- ============================================================

ALTER TABLE desempenho.app_users
  ADD COLUMN IF NOT EXISTS auth_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 2. Remove password column from app_users
-- ============================================================

ALTER TABLE desempenho.app_users
  DROP COLUMN IF EXISTS password;

-- ============================================================
-- 3. Create manage_user function (SECURITY DEFINER)
--    This replaces Edge Functions for self-hosted Supabase
-- ============================================================

CREATE OR REPLACE FUNCTION desempenho.manage_user(
  action TEXT,
  user_email TEXT DEFAULT NULL,
  user_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'CONTRIBUTOR',
  user_role_title TEXT DEFAULT '',
  user_avatar TEXT DEFAULT '',
  user_metrics JSONB DEFAULT '[]'::jsonb,
  target_user_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = desempenho, public, auth
AS $$
DECLARE
  caller_role TEXT;
  new_auth_id UUID;
  new_user_id TEXT;
  default_password TEXT := 'ordus2025';
  result JSONB;
BEGIN
  -- Validate caller is PARTNER
  SELECT role INTO caller_role
  FROM desempenho.app_users
  WHERE auth_id = auth.uid()::text;

  IF caller_role IS NULL OR caller_role != 'PARTNER' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: only PARTNERs can manage users');
  END IF;

  -- ─── CREATE ─────────────────────────────────────────────
  IF action = 'create' THEN
    IF user_email IS NULL OR user_name IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Email and name are required');
    END IF;

    -- Check if email already exists in auth
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
    END IF;

    -- Create auth user
    new_auth_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at
    ) VALUES (
      new_auth_id,
      '00000000-0000-0000-0000-000000000000',
      user_email,
      crypt(default_password, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', user_name),
      'authenticated',
      'authenticated',
      NOW(),
      NOW()
    );

    -- Create identity record
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_auth_id,
      new_auth_id,
      user_email,
      'email',
      jsonb_build_object('sub', new_auth_id::text, 'email', user_email),
      NOW(),
      NOW(),
      NOW()
    );

    -- Create app_users record
    new_user_id := 'u_' || extract(epoch from now())::bigint;

    INSERT INTO desempenho.app_users (id, name, role, role_title, avatar, metrics, auth_id, email, password_changed)
    VALUES (new_user_id, user_name, user_role, user_role_title, user_avatar, user_metrics, new_auth_id::text, user_email, false);

    RETURN jsonb_build_object('success', true, 'user_id', new_user_id, 'auth_id', new_auth_id::text);

  -- ─── DELETE ─────────────────────────────────────────────
  ELSIF action = 'delete' THEN
    IF target_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'target_user_id is required');
    END IF;

    -- Get auth_id before deleting
    SELECT auth_id INTO new_auth_id
    FROM desempenho.app_users
    WHERE id = target_user_id;

    -- Delete from app_users
    DELETE FROM desempenho.app_users WHERE id = target_user_id;

    -- Delete from auth if auth_id exists
    IF new_auth_id IS NOT NULL THEN
      DELETE FROM auth.identities WHERE user_id = new_auth_id;
      DELETE FROM auth.sessions WHERE user_id = new_auth_id;
      DELETE FROM auth.refresh_tokens WHERE user_id = new_auth_id;
      DELETE FROM auth.users WHERE id = new_auth_id;
    END IF;

    RETURN jsonb_build_object('success', true);

  -- ─── RESET PASSWORD ─────────────────────────────────────
  ELSIF action = 'reset_password' THEN
    IF target_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'target_user_id is required');
    END IF;

    -- Get auth_id
    SELECT auth_id INTO new_auth_id
    FROM desempenho.app_users
    WHERE id = target_user_id;

    IF new_auth_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'User has no auth account');
    END IF;

    -- Reset password in auth.users
    UPDATE auth.users
    SET encrypted_password = crypt(default_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = new_auth_id;

    -- Mark password_changed as false
    UPDATE desempenho.app_users
    SET password_changed = false
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true);

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Use: create, delete, reset_password');
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 4. Seed 3 PARTNERs in auth.users
-- ============================================================

-- Leandro (u4)
DO $$
DECLARE
  v_auth_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'leandrogeseth@gmail.com') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (v_auth_id, '00000000-0000-0000-0000-000000000000', 'leandrogeseth@gmail.com', crypt('L094021g**', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Leandro"}'::jsonb, 'authenticated', 'authenticated', NOW(), NOW());

    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (v_auth_id, v_auth_id, 'leandrogeseth@gmail.com', 'email', jsonb_build_object('sub', v_auth_id::text, 'email', 'leandrogeseth@gmail.com'), NOW(), NOW(), NOW());

    UPDATE desempenho.app_users SET auth_id = v_auth_id::text, email = 'leandrogeseth@gmail.com', password_changed = true WHERE id = 'u4';
  END IF;
END $$;

-- Joel (u5)
DO $$
DECLARE
  v_auth_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ojoeljunior1@gmail.com') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (v_auth_id, '00000000-0000-0000-0000-000000000000', 'ojoeljunior1@gmail.com', crypt('ordus2025', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Joel"}'::jsonb, 'authenticated', 'authenticated', NOW(), NOW());

    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (v_auth_id, v_auth_id, 'ojoeljunior1@gmail.com', 'email', jsonb_build_object('sub', v_auth_id::text, 'email', 'ojoeljunior1@gmail.com'), NOW(), NOW(), NOW());

    UPDATE desempenho.app_users SET auth_id = v_auth_id::text, email = 'ojoeljunior1@gmail.com', password_changed = false WHERE id = 'u5';
  END IF;
END $$;

-- Adriano (u6)
DO $$
DECLARE
  v_auth_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sistemawebinfo@gmail.com') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (v_auth_id, '00000000-0000-0000-0000-000000000000', 'sistemawebinfo@gmail.com', crypt('ordus2025', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Adriano"}'::jsonb, 'authenticated', 'authenticated', NOW(), NOW());

    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (v_auth_id, v_auth_id, 'sistemawebinfo@gmail.com', 'email', jsonb_build_object('sub', v_auth_id::text, 'email', 'sistemawebinfo@gmail.com'), NOW(), NOW(), NOW());

    UPDATE desempenho.app_users SET auth_id = v_auth_id::text, email = 'sistemawebinfo@gmail.com', password_changed = false WHERE id = 'u6';
  END IF;
END $$;

-- ============================================================
-- 5. Grant execute permission on manage_user to authenticated
-- ============================================================

GRANT EXECUTE ON FUNCTION desempenho.manage_user TO authenticated;
