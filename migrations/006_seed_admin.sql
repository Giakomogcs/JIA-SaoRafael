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
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object(
      'company_name', 'saorafael',
      'role', p_role,
      'full_name', p_full_name
    ),
    NOW(),
    NOW()
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

-- =======  DOWN  ========
-- DROP FUNCTION IF EXISTS saorafael_create_user(TEXT, TEXT, TEXT, TEXT);
