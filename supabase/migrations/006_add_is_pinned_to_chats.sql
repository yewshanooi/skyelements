-- Add is_pinned to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
