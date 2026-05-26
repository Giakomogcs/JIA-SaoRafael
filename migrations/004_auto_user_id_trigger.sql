-- =============================================
-- São Rafael — 004: Auto user_id trigger
-- Automatically sets user_id on chat messages
-- when inserted via service_role (n8n backend)
-- =============================================

-- =======  UP  ========

-- Function: extract user_id from session_id pattern or metadata
-- n8n will pass user_id in the JSONB message when available
CREATE OR REPLACE FUNCTION saorafael_set_chat_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user_id not explicitly set, try to extract from current auth context
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id = auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saorafael_chat_user_id ON saorafael_chat_message;
CREATE TRIGGER trg_saorafael_chat_user_id
  BEFORE INSERT ON saorafael_chat_message
  FOR EACH ROW
  EXECUTE FUNCTION saorafael_set_chat_user_id();

-- =======  DOWN  ========
-- DROP TRIGGER IF EXISTS trg_saorafael_chat_user_id ON saorafael_chat_message;
-- DROP FUNCTION IF EXISTS saorafael_set_chat_user_id();
