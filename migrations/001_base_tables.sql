-- =============================================
-- São Rafael — 001: Base Tables
-- Chat messages + Wizard sessions
-- =============================================

-- =======  UP  ========

-- 1. Chat messages table (stores wizard validation + conversational messages)
CREATE TABLE IF NOT EXISTS saorafael_chat_message (
  id          BIGSERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL,
  message     JSONB NOT NULL,  -- {type: 'human'|'ai', content: '...'}
  user_id     UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saorafael_chat_session
  ON saorafael_chat_message (session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_saorafael_chat_user
  ON saorafael_chat_message (user_id);

-- 2. Wizard submissions table (finalized quotes)
CREATE TABLE IF NOT EXISTS saorafael_wizard_submission (
  id          BIGSERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL UNIQUE,
  user_id     UUID,
  form_data   JSONB NOT NULL,   -- Complete wizard JSON
  status      TEXT DEFAULT 'submitted',  -- submitted | processing | completed | error
  protocol    TEXT,              -- Generated protocol number
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_saorafael_wizard_status
  ON saorafael_wizard_submission (status);

CREATE INDEX IF NOT EXISTS idx_saorafael_wizard_user
  ON saorafael_wizard_submission (user_id);

-- 3. Chat sessions view (for sidebar listing)
CREATE OR REPLACE VIEW saorafael_chat_sessions AS
SELECT
  session_id,
  MIN(created_at) AS data_inicio,
  MAX(created_at) AS data_ultimo,
  COUNT(*) AS total_mensagens,
  (SELECT m2.message->>'content'
   FROM saorafael_chat_message m2
   WHERE m2.session_id = m.session_id
     AND m2.message->>'type' = 'human'
   ORDER BY m2.created_at ASC
   LIMIT 1
  ) AS titulo
FROM saorafael_chat_message m
GROUP BY session_id
ORDER BY MAX(created_at) DESC;

-- =======  DOWN  ========
-- DROP VIEW IF EXISTS saorafael_chat_sessions;
-- DROP TABLE IF EXISTS saorafael_wizard_submission;
-- DROP TABLE IF EXISTS saorafael_chat_message;
