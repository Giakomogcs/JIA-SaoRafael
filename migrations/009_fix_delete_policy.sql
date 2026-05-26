-- =============================================
-- São Rafael — 009: Fix Delete Policy + processed_at
-- Adds missing DELETE policy for wizard submissions
-- =============================================

-- Admin can delete submissions
DROP POLICY IF EXISTS "Admins can delete submissions" ON saorafael_wizard_submission;
CREATE POLICY "Admins can delete submissions"
  ON saorafael_wizard_submission
  FOR DELETE
  TO authenticated
  USING (saorafael_is_admin());

-- Users can delete their own (optional — remove if only admins should delete)
-- CREATE POLICY "Users can delete own submissions"
--   ON saorafael_wizard_submission
--   FOR DELETE
--   TO authenticated
--   USING (user_id = auth.uid());
