-- =============================================
-- São Rafael — 010: Ensure user_id column exists on chat_message
-- Fixes: "column m.user_id does not exist" error
-- =============================================

-- =======  UP  ========

-- Add user_id column if missing (table may have been created before migration 001 was finalized)
ALTER TABLE saorafael_chat_message
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Recreate index in case it's missing
CREATE INDEX IF NOT EXISTS idx_saorafael_chat_user
  ON saorafael_chat_message (user_id);

-- Recreate the list_sessions function
-- n8n inserts via service_role so user_id is NULL on most messages.
-- Allow sessions where user_id matches OR is NULL (inserted by n8n backend).
-- Must DROP first to avoid "structure does not match" from old signature.
DROP FUNCTION IF EXISTS saorafael_list_sessions();

CREATE FUNCTION saorafael_list_sessions()
RETURNS TABLE (
  session_id TEXT,
  titulo TEXT,
  data_inicio TIMESTAMPTZ,
  data_ultimo TIMESTAMPTZ,
  total_mensagens BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.session_id::TEXT,
    LEFT(
      SPLIT_PART(
        (SELECT m2.message->>'content'
         FROM saorafael_chat_message m2
         WHERE m2.session_id = m.session_id
           AND m2.message->>'type' = 'human'
         ORDER BY m2.created_at ASC
         LIMIT 1
        ),
        '[CONTEXTO', 1
      ),
      80
    )::TEXT AS titulo,
    MIN(m.created_at)::TIMESTAMPTZ AS data_inicio,
    MAX(m.created_at)::TIMESTAMPTZ AS data_ultimo,
    COUNT(*)::BIGINT AS total_mensagens
  FROM saorafael_chat_message m
  WHERE m.user_id = auth.uid() OR m.user_id IS NULL
  GROUP BY m.session_id
  ORDER BY MAX(m.created_at) DESC;
END;
$$;

-- Recreate get_history function with explicit casts
DROP FUNCTION IF EXISTS saorafael_get_history(TEXT);

CREATE FUNCTION saorafael_get_history(p_session_id TEXT)
RETURNS TABLE (
  id BIGINT,
  message JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id::BIGINT,
    cm.message::JSONB,
    cm.created_at::TIMESTAMPTZ
  FROM saorafael_chat_message cm
  WHERE cm.session_id = p_session_id
  ORDER BY cm.created_at ASC;
END;
$$;

-- Recreate delete_session function
DROP FUNCTION IF EXISTS saorafael_delete_session(TEXT);

CREATE FUNCTION saorafael_delete_session(p_session_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM saorafael_chat_message
  WHERE session_id = p_session_id;
END;
$$;

-- =======  DOWN  ========
-- ALTER TABLE saorafael_chat_message DROP COLUMN IF EXISTS user_id;
