-- Add UPDATE and DELETE policies for ai_conversations
-- Currently only SELECT and INSERT exist, causing:
-- - Delete button silently fails
-- - Conversations don't persist after reload (UPDATE fails)

-- UPDATE policy: users can update their own conversations
CREATE POLICY "Users can update own conversations" 
  ON ai_conversations 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy: users can delete their own conversations
CREATE POLICY "Users can delete own conversations" 
  ON ai_conversations 
  FOR DELETE 
  USING (auth.uid() = user_id);
