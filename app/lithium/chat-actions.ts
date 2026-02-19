'use server';

import { createActionClient } from "@/utils/supabase/actions";

export type Chat = {
  id: string;
  user_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

/** Create a new chat and return it */
export async function createChat(model: string = 'openrouter:arcee-ai/trinity-large-preview:free'): Promise<Chat> {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('chats')
    .insert({ user_id: user.id, model, title: 'New Chat' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Chat;
}

/** List all chats for the current user, newest first */
export async function listChats(): Promise<Chat[]> {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Chat[];
}

/** Get messages for a chat */
export async function getMessages(chatId: string): Promise<Message[]> {
  const supabase = await createActionClient();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}

/** Save a message to a chat */
export async function saveMessage(chatId: string, role: 'user' | 'assistant', content: string): Promise<Message> {
  const supabase = await createActionClient();

  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, role, content })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId);

  return data as Message;
}

/** Update chat title */
export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  const supabase = await createActionClient();

  const { error } = await supabase
    .from('chats')
    .update({ title })
    .eq('id', chatId);

  if (error) throw new Error(error.message);
}

/** Delete a chat */
export async function deleteChat(chatId: string): Promise<void> {
  const supabase = await createActionClient();

  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId);

  if (error) throw new Error(error.message);
}
