-- =============================================
-- São Rafael — 006: Create User Function + Seed Instructions
-- =============================================
-- IMPORTANT: Do NOT create users via INSERT INTO auth.users.
-- Supabase GoTrue requires users to be created via its API.
--
-- === STEPS TO CREATE ADMIN ===
--
-- 1. Call the signup API (via curl, Postman, or PowerShell):
--
--    POST https://<SUPABASE_URL>/auth/v1/signup
--    Headers: { "apikey": "<ANON_KEY>", "Content-Type": "application/json" }
--    Body: {
--      "email": "admin@saorafael.com",
--      "password": "@Admin123",
--      "data": {
--        "company_name": "saorafael",
--        "role": "admin",
--        "full_name": "Administrador São Rafael"
--      }
--    }
--
-- 2. Then confirm the email directly in SQL Editor:
--
--    UPDATE auth.users
--    SET email_confirmed_at = NOW()
--    WHERE email = 'admin@saorafael.com';
--
-- =============================================

-- pgcrypto provides crypt() and gen_salt(); on Supabase it lives in the `extensions` schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION saorafael_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT '',
  p_role TEXT DEFAULT 'usuario'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  IF NOT saorafael_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar usuários.';
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'usuario', 'visualizador') THEN
    RAISE EXCEPTION 'Role inválido. Use: admin, usuario, visualizador';
  END IF;

  -- Create user in auth.users
  new_user_id := (
    SELECT id FROM auth.users
    WHERE email = p_email
  );

  IF new_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Usuário com este email já existe.';
  END IF;

  -- Insert into auth.users (Supabase internal)
  -- NOTE: token columns (confirmation_token, recovery_token, email_change*,
  -- phone_change*, reauthentication_token) MUST be '' (empty string), never NULL.
  -- GoTrue scans these as Go strings on login; a NULL value raises
  -- "converting NULL to string" → HTTP 500 with no body, which supabase-js
  -- surfaces as an empty error object `{}`.
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email')
    ),
    jsonb_build_object(
      'company_name', 'saorafael',
      'role', p_role,
      'full_name', p_full_name
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Also create identity record
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', p_email),
    'email',
    new_user_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  RETURN new_user_id;
END;
$$;

-- =============================================
-- REPAIR: fix users already created with NULL token columns
-- Run this once to unblock logins that fail with an empty `{}` error.
-- (Safe / idempotent: only touches rows where the column is NULL.)
-- =============================================
UPDATE auth.users SET
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE
  confirmation_token IS NULL OR
  recovery_token IS NULL OR
  email_change IS NULL OR
  email_change_token_new IS NULL OR
  email_change_token_current IS NULL OR
  phone_change IS NULL OR
  phone_change_token IS NULL OR
  reauthentication_token IS NULL;

-- =======  DOWN  ========
-- DROP FUNCTION IF EXISTS saorafael_create_user(TEXT, TEXT, TEXT, TEXT);
