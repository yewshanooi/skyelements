-- Multi-file support: move per-message file metadata into a 1-to-many table.

CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,           -- storage path inside the chat-uploads bucket
  file_mime_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_position ON message_attachments(message_id, position);

-- Migrate existing single-file rows into the new table before dropping the
-- legacy columns. COALESCE guards against historical rows with NULL metadata.
INSERT INTO message_attachments (message_id, file_url, file_mime_type, file_name, position)
SELECT
  id,
  file_url,
  COALESCE(file_mime_type, 'application/octet-stream'),
  COALESCE(file_name, 'file'),
  0
FROM messages
WHERE file_url IS NOT NULL;

ALTER TABLE messages
  DROP COLUMN IF EXISTS file_url,
  DROP COLUMN IF EXISTS file_mime_type,
  DROP COLUMN IF EXISTS file_name;

ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Access mirrors message access (which already cascades from chats.user_id).
CREATE POLICY "Users can view attachments on their messages"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.id = message_attachments.message_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments on their messages"
  ON message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.id = message_attachments.message_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments on their messages"
  ON message_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.id = message_attachments.message_id
        AND c.user_id = auth.uid()
    )
  );
