-- ==============================================================================
-- SUPABASE DATABASE SCHEMA FOR UNIFIED AI CHAT (MIGRATION 018)
-- ==============================================================================

-- 1. Create Unified AI Chats Table
CREATE TABLE IF NOT EXISTS public.ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  model TEXT NOT NULL DEFAULT 'gemini-3.5-flash-lite',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create Unified AI Messages Table
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.ai_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Unified AI Attachments Table
CREATE TABLE IF NOT EXISTS public.ai_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.ai_messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_mime_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON public.ai_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_updated_at ON public.ai_chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_chat_id ON public.ai_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON public.ai_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_attachments_message_id ON public.ai_attachments(message_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_attachments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Users can manage their own ai_chats"
  ON public.ai_chats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage messages in their ai_chats"
  ON public.ai_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ai_chats c WHERE c.id = chat_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_chats c WHERE c.id = chat_id AND c.user_id = auth.uid()));

CREATE POLICY "Users can manage their ai_attachments"
  ON public.ai_attachments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.ai_messages m
    JOIN public.ai_chats c ON c.id = m.chat_id
    WHERE m.id = message_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_messages m
    JOIN public.ai_chats c ON c.id = m.chat_id
    WHERE m.id = message_id AND c.user_id = auth.uid()
  ));

-- 7. Drop Legacy Chat Tables (Consolidated into ai_chats)
DROP TABLE IF EXISTS public.message_attachments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;

-- 8. Update Account Deletion Function to Cascade Delete ai_chats
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Clean up application data across the active mini apps
  DELETE FROM public.ai_chats WHERE user_id = current_user_id;
  DELETE FROM public.sales WHERE user_id = current_user_id;
  DELETE FROM public.notes WHERE user_id = current_user_id;

  -- Auth rows are removed only after application data is gone
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;
