-- Chat message history for AI Planning Assistant
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  role TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_wedding_admin
  ON chat_messages (wedding_id, admin_email, created_at);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_wedding_isolation"
  ON chat_messages
  FOR ALL
  USING (wedding_id = current_setting('app.current_wedding_id', true)::uuid);
