'use server';

import { GoogleGenAI, Content } from "@google/genai";
import { ALLOWED_MODEL_IDS } from "@/lib/models";
import { buildOptimizedHistory } from "@/lib/chat-context";
import { getAuthenticatedClient } from "./auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type FileAttachment = {
  base64: string;
  mimeType: string;
  fileName: string;
};

export type Chat = {
  id: string;
  user_id: string;
  title: string;
  model: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  file_url?: string | null;
  file_mime_type?: string | null;
  file_name?: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// AI Generation
// ---------------------------------------------------------------------------

export async function generateContent(
  prompt: string,
  model: string = "gemini-3.1-flash-lite",
  history: ChatMessage[] = [],
  fileStoragePath?: string,
  fileMimeType?: string,
) {
  const { supabase } = await getAuthenticatedClient();

  if (!ALLOWED_MODEL_IDS.has(model)) {
    return "Sorry, the requested model is not available.";
  }

  // Optimize history to fit within model context budget
  const optimizedHistory = buildOptimizedHistory(history, model);

  // Download attached file from storage
  let file: FileAttachment | undefined;
  if (fileStoragePath && fileMimeType) {
    const { data, error } = await supabase.storage.from(BUCKET).download(fileStoragePath);
    if (error || !data) {
      console.error('Failed to download file from storage:', error);
      return "Sorry, I couldn't process the attached file.";
    }
    const arrayBuffer = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const fileName = fileStoragePath.split('/').pop() || 'file';
    file = { base64, mimeType: fileMimeType, fileName };
  }

  if (!process.env.GOOGLE_API_KEY) {
    console.error("GOOGLE_API_KEY environment variable is not set.");

    return "Sorry, I couldn't generate a response at this time.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  const contents: Content[] = [
    ...optimizedHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    } as Content)),
  ];

  // Build the user message parts
  const userParts: Content['parts'] = [];

  if (file) {
    userParts.push({ inlineData: { data: file.base64, mimeType: file.mimeType } });
  }

  const isImage = file?.mimeType.startsWith('image/');
  userParts.push({ text: prompt || (isImage ? 'What is in this image?' : file ? 'Analyze this file.' : '') });

  contents.push({ role: 'user', parts: userParts } as Content);

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
    });
    return response.text;
  } catch (error: any) {
    console.error("Error generating content:", error);

    if (error?.status === 429) {
      return `⚠️ **Free Quota Exceeded**\n\nWe've hit the daily free quota for the ${model} model. Please change to another model or try again tomorrow.`;
    }

    if (error?.status === 503) {
      return '⚠️ **Service Unavailable**\n\nThis model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.';
    }

    return "Sorry, I couldn't generate a response at this time.";
  }
}

// ---------------------------------------------------------------------------
// File Storage Helpers
// ---------------------------------------------------------------------------

const BUCKET = 'chat-images';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

/** Generate a signed URL for a stored file */
async function getSignedFileUrl(storagePath: string): Promise<string | null> {
  const { supabase } = await getAuthenticatedClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL:', error);
    return null;
  }
  return data.signedUrl;
}

/** Remove stored files for the given chat IDs */
async function removeStorageFiles(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'],
  chatIds: string[],
) {
  if (chatIds.length === 0) return;

  const { data: msgs } = await supabase
    .from('messages')
    .select('file_url')
    .in('chat_id', chatIds)
    .not('file_url', 'is', null);

  const paths = (msgs ?? [])
    .map((m: { file_url?: string | null }) => m.file_url)
    .filter((p): p is string => !!p);

  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
}

// ---------------------------------------------------------------------------
// Chat CRUD
// ---------------------------------------------------------------------------

/** Create a new chat and return it */
export async function createChat(model: string = 'gemini-3.1-flash-lite'): Promise<Chat> {
  if (!ALLOWED_MODEL_IDS.has(model)) {
    throw new Error('Invalid model specified.');
  }

  const { supabase, user } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from('chats')
    .insert({ user_id: user.id, model, title: 'New chat' })
    .select()
    .single();

  if (error) {
    console.error('[chat-actions] createChat DB error:', error);
    throw new Error('Failed to create chat.');
  }

  return data as Chat;
}

/** List all chats for the current user, newest first */
export async function listChats(): Promise<Chat[]> {
  const { supabase, user } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from('chats')
    .select('id, title, model, is_pinned, created_at, updated_at')
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[chat-actions] listChats DB error:', error);
    throw new Error('Failed to load chats.');
  }

  return (data ?? []) as Chat[];
}

/** Get messages for a chat */
export async function getMessages(chatId: string): Promise<(Message & { signedFileUrl?: string | null })[]> {
  const { supabase } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[chat-actions] getMessages DB error:', error);
    throw new Error('Failed to load messages.');
  }

  const messages = (data ?? []) as Message[];

  // Generate signed URLs for messages that have files
  const enriched = await Promise.all(
    messages.map(async (msg) => {
      const signedFileUrl = msg.file_url ? await getSignedFileUrl(msg.file_url) : null;
      return { ...msg, signedFileUrl };
    })
  );

  return enriched;
}

/** Save a message to a chat */
export async function saveMessage(
  chatId: string,
  role: 'user' | 'assistant',
  content: string,
  fileUrl?: string | null,
  fileMimeType?: string | null,
  fileName?: string | null,
): Promise<Message> {
  const { supabase, user } = await getAuthenticatedClient();

  const insertData: Record<string, unknown> = { chat_id: chatId, role, content };
  if (fileUrl) insertData.file_url = fileUrl;
  if (fileMimeType) insertData.file_mime_type = fileMimeType;
  if (fileName) insertData.file_name = fileName;

  const { data, error } = await supabase
    .from('messages')
    .insert(insertData)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId)
    .eq('user_id', user.id);

  return data as Message;
}

/** Update chat title */
export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  const { error } = await supabase
    .from('chats')
    .update({ title })
    .eq('id', chatId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[chat-actions] updateChatTitle DB error:', error);
    throw new Error('Failed to update chat title.');
  }
}

/** Update chat pinned state */
export async function togglePinChat(chatId: string, isPinned: boolean): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  const { error } = await supabase
    .from('chats')
    .update({ is_pinned: isPinned })
    .eq('id', chatId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[chat-actions] togglePinChat DB error:', error);
    throw new Error('Failed to update pin state.');
  }
}

/** Delete a chat */
export async function deleteChat(chatId: string): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  await removeStorageFiles(supabase, [chatId]);

  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[chat-actions] deleteChat DB error:', error);
    throw new Error('Failed to delete chat.');
  }
}

/** Delete all chats for the current user */
export async function deleteAllChats(): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  const { data: chats } = await supabase
    .from('chats')
    .select('id')
    .eq('user_id', user.id);

  const chatIds = (chats ?? []).map((c: { id: string }) => c.id);
  await removeStorageFiles(supabase, chatIds);

  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('[chat-actions] deleteAllChats DB error:', error);
    throw new Error('Failed to delete chats.');
  }
}
