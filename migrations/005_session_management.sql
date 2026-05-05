-- =============================================
-- São Rafael — 005: Session Management Functions
-- List, delete, prune sessions
-- =============================================

-- =======  UP  ========

-- List sessions for current user
CREATE OR REPLACE FUNCTION saorafael_list_sessions()
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
    m.session_id,
    (SELECT m2.message->>'content'
     FROM saorafael_chat_message m2
     WHERE m2.session_id = m.session_id
       AND m2.message->>'type' = 'human'
     ORDER BY m2.created_at ASC
     LIMIT 1
    )::TEXT AS titulo,
    MIN(m.created_at) AS data_inicio,
    MAX(m.created_at) AS data_ultimo,
    COUNT(*)::BIGINT AS total_mensagens
  FROM saorafael_chat_message m
  WHERE m.user_id = auth.uid()
  GROUP BY m.session_id
  ORDER BY MAX(m.created_at) DESC;
END;
$$;

-- Delete a session (user's own or admin)
CREATE OR REPLACE FUNCTION saorafael_delete_session(p_session_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT saorafael_is_admin() THEN
    -- Only delete own session
    DELETE FROM saorafael_chat_message
    WHERE session_id = p_session_id
      AND user_id = auth.uid();
  ELSE
    -- Admin can delete any session
    DELETE FROM saorafael_chat_message
    WHERE session_id = p_session_id;
  END IF;
END;
$$;

-- Get chat history for a session
CREATE OR REPLACE FUNCTION saorafael_get_history(p_session_id TEXT)
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
    cm.id,
    cm.message,
    cm.created_at
  FROM saorafael_chat_message cm
  WHERE cm.session_id = p_session_id
    AND (cm.user_id = auth.uid() OR saorafael_is_admin())
  ORDER BY cm.created_at ASC;
END;
$$;

-- Prune history: keep only last N messages in a session
CREATE OR REPLACE FUNCTION saorafael_prune_history(
  p_session_id TEXT,
  p_keep_last INT DEFAULT 10
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  IF NOT (saorafael_is_admin() OR EXISTS(
    SELECT 1 FROM saorafael_chat_message
    WHERE session_id = p_session_id AND user_id = auth.uid()
  )) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  WITH to_keep AS (
    SELECT cm.id
    FROM saorafael_chat_message cm
    WHERE cm.session_id = p_session_id
    ORDER BY cm.created_at DESC
    LIMIT p_keep_last
  )
  DELETE FROM saorafael_chat_message
  WHERE session_id = p_session_id
    AND id NOT IN (SELECT id FROM to_keep);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- =======  DOWN  ========
-- DROP FUNCTION IF EXISTS saorafael_prune_history(TEXT, INT);
-- DROP FUNCTION IF EXISTS saorafael_get_history(TEXT);
-- DROP FUNCTION IF EXISTS saorafael_delete_session(TEXT);
-- DROP FUNCTION IF EXISTS saorafael_list_sessions();
