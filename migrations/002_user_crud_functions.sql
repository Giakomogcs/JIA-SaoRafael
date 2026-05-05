-- =============================================
-- São Rafael — 002: User CRUD Functions
-- Admin manages users (SECURITY DEFINER)
-- company_name = 'saorafael'
-- =============================================

-- =======  UP  ========

-- Helper: Check if current user is saorafael admin
CREATE OR REPLACE FUNCTION saorafael_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND raw_user_meta_data->>'company_name' = 'saorafael'
      AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$;

-- List all saorafael users (admin only)
CREATE OR REPLACE FUNCTION saorafael_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  role TEXT,
  full_name TEXT,
  confirmed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT saorafael_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar usuários.';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(u.raw_user_meta_data->>'role', 'visualizador')::TEXT AS role,
    COALESCE(u.raw_user_meta_data->>'full_name', '')::TEXT AS full_name,
    (u.email_confirmed_at IS NOT NULL) AS confirmed
  FROM auth.users u
  WHERE u.raw_user_meta_data->>'company_name' = 'saorafael'
  ORDER BY u.created_at DESC;
END;
$$;

-- Confirm a user (admin only)
CREATE OR REPLACE FUNCTION saorafael_confirm_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT saorafael_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem confirmar usuários.';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = target_user_id
    AND raw_user_meta_data->>'company_name' = 'saorafael';
END;
$$;

-- Update user role/name (admin only)
CREATE OR REPLACE FUNCTION saorafael_update_user(
  target_user_id UUID,
  new_role TEXT DEFAULT NULL,
  new_full_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB;
BEGIN
  IF NOT saorafael_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem atualizar usuários.';
  END IF;

  SELECT raw_user_meta_data INTO meta
  FROM auth.users
  WHERE id = target_user_id
    AND raw_user_meta_data->>'company_name' = 'saorafael';

  IF meta IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado ou não pertence à São Rafael.';
  END IF;

  IF new_role IS NOT NULL THEN
    meta = jsonb_set(meta, '{role}', to_jsonb(new_role));
  END IF;

  IF new_full_name IS NOT NULL THEN
    meta = jsonb_set(meta, '{full_name}', to_jsonb(new_full_name));
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = meta,
      updated_at = NOW()
  WHERE id = target_user_id
    AND raw_user_meta_data->>'company_name' = 'saorafael';
END;
$$;

-- Delete user (admin only)
CREATE OR REPLACE FUNCTION saorafael_delete_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT saorafael_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir usuários.';
  END IF;

  -- Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível excluir o próprio usuário.';
  END IF;

  DELETE FROM auth.users
  WHERE id = target_user_id
    AND raw_user_meta_data->>'company_name' = 'saorafael';
END;
$$;

-- =======  DOWN  ========
-- DROP FUNCTION IF EXISTS saorafael_delete_user(UUID);
-- DROP FUNCTION IF EXISTS saorafael_update_user(UUID, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS saorafael_confirm_user(UUID);
-- DROP FUNCTION IF EXISTS saorafael_list_users();
-- DROP FUNCTION IF EXISTS saorafael_is_admin();
