-- =============================================
-- São Rafael — 003: RLS Policies
-- Row-Level Security for chat & submissions
-- =============================================

-- =======  UP  ========

-- Enable RLS on tables
ALTER TABLE saorafael_chat_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE saorafael_wizard_submission ENABLE ROW LEVEL SECURITY;

-- Chat messages: users can read/write only their own sessions
DROP POLICY IF EXISTS "Users can insert own chat messages" ON saorafael_chat_message;
CREATE POLICY "Users can insert own chat messages"
  ON saorafael_chat_message
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own chat messages" ON saorafael_chat_message;
CREATE POLICY "Users can read own chat messages"
  ON saorafael_chat_message
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all chat messages" ON saorafael_chat_message;
CREATE POLICY "Admins can read all chat messages"
  ON saorafael_chat_message
  FOR SELECT
  TO authenticated
  USING (saorafael_is_admin());

DROP POLICY IF EXISTS "Admins can delete chat messages" ON saorafael_chat_message;
CREATE POLICY "Admins can delete chat messages"
  ON saorafael_chat_message
  FOR DELETE
  TO authenticated
  USING (saorafael_is_admin() OR user_id = auth.uid());

-- Wizard submissions: users can manage their own
DROP POLICY IF EXISTS "Users can insert own submissions" ON saorafael_wizard_submission;
CREATE POLICY "Users can insert own submissions"
  ON saorafael_wizard_submission
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own submissions" ON saorafael_wizard_submission;
CREATE POLICY "Users can read own submissions"
  ON saorafael_wizard_submission
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all submissions" ON saorafael_wizard_submission;
CREATE POLICY "Admins can read all submissions"
  ON saorafael_wizard_submission
  FOR SELECT
  TO authenticated
  USING (saorafael_is_admin());

DROP POLICY IF EXISTS "Admins can update submissions" ON saorafael_wizard_submission;
CREATE POLICY "Admins can update submissions"
  ON saorafael_wizard_submission
  FOR UPDATE
  TO authenticated
  USING (saorafael_is_admin());

-- Service role bypass (for n8n webhook backend)
DROP POLICY IF EXISTS "Service role full access chat" ON saorafael_chat_message;
CREATE POLICY "Service role full access chat"
  ON saorafael_chat_message
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access submissions" ON saorafael_wizard_submission;
CREATE POLICY "Service role full access submissions"
  ON saorafael_wizard_submission
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =======  DOWN  ========
-- DROP POLICY IF EXISTS "Service role full access submissions" ON saorafael_wizard_submission;
-- DROP POLICY IF EXISTS "Service role full access chat" ON saorafael_chat_message;
-- DROP POLICY IF EXISTS "Admins can update submissions" ON saorafael_wizard_submission;
-- DROP POLICY IF EXISTS "Admins can read all submissions" ON saorafael_wizard_submission;
-- DROP POLICY IF EXISTS "Users can read own submissions" ON saorafael_wizard_submission;
-- DROP POLICY IF EXISTS "Users can insert own submissions" ON saorafael_wizard_submission;
-- DROP POLICY IF EXISTS "Admins can delete chat messages" ON saorafael_chat_message;
-- DROP POLICY IF EXISTS "Admins can read all chat messages" ON saorafael_chat_message;
-- DROP POLICY IF EXISTS "Users can read own chat messages" ON saorafael_chat_message;
-- DROP POLICY IF EXISTS "Users can insert own chat messages" ON saorafael_chat_message;
-- ALTER TABLE saorafael_wizard_submission DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE saorafael_chat_message DISABLE ROW LEVEL SECURITY;
