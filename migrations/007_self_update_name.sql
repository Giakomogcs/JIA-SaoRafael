-- =============================================
-- São Rafael — 007: Allow user to update own name
-- Any authenticated saorafael user can change their own full_name
-- =============================================

-- =======  UP  ========

CREATE OR REPLACE FUNCTION saorafael_update_own_name(new_full_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB;
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  -- Get current metadata
  SELECT raw_user_meta_data INTO meta
  FROM auth.users
  WHERE id = auth.uid()
    AND raw_user_meta_data->>'company_name' = 'saorafael';

  IF meta IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado ou não pertence à São Rafael.';
  END IF;

  -- Update only full_name
  meta = jsonb_set(meta, '{full_name}', to_jsonb(new_full_name));

  UPDATE auth.users
  SET raw_user_meta_data = meta,
      updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

-- =======  DOWN  ========
-- DROP FUNCTION IF EXISTS saorafael_update_own_name(TEXT);
