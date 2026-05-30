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

/** Stored attachment reference passed from the client */
export type AttachmentRef = {
  storagePath: string;
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

export type MessageAttachment = {
  id: string;
  message_id: string;
  file_url: string;
  file_mime_type: string;
  file_name: string;
  position: number;
  created_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type MessageWithAttachments = Message & {
  attachments: (MessageAttachment & { signedFileUrl: string | null })[];
};

// ---------------------------------------------------------------------------
// AI Generation
// ---------------------------------------------------------------------------

export async function generateContent(
  prompt: string,
  model: string = "gemini-3.1-flash-lite",
  history: ChatMessage[] = [],
  attachments: AttachmentRef[] = [],
) {
  const { supabase } = await getAuthenticatedClient();

  if (!ALLOWED_MODEL_IDS.has(model)) {
    return "Sorry, the requested model is not available.";
  }

  // Optimize history to fit within model context budget
  const optimizedHistory = buildOptimizedHistory(history, model);

  // Download attached files from storage (in parallel)
  const files: FileAttachment[] = [];
  if (attachments.length > 0) {
    const downloads = await Promise.all(
      attachments.map(async (att) => {
        const { data, error } = await supabase.storage.from(BUCKET).download(att.storagePath);
        if (error || !data) {
          console.error('Failed to download file from storage:', att.storagePath, error);
          return null;
        }
        const arrayBuffer = await data.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return { base64, mimeType: att.mimeType, fileName: att.fileName } as FileAttachment;
      })
    );

    for (const f of downloads) {
      if (f) files.push(f);
    }

    if (files.length === 0 && attachments.length > 0) {
      return "Sorry, I couldn't process the attached files.";
    }
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

  // Build the user message parts.
  const userParts: Content['parts'] = [];

  let leadingPrompt = prompt;
  if (!leadingPrompt && files.length > 0) {
    const allImages = files.every(f => f.mimeType.startsWith('image/'));
    if (allImages) {
      leadingPrompt = files.length > 1
        ? 'What is in these images?'
        : 'What is in this image?';
    } else {
      leadingPrompt = files.length > 1
        ? 'Analyze these files.'
        : 'Analyze this file.';
    }
  }

  if (files.length > 1) {
    userParts.push({
      text: `${leadingPrompt}\n\n(The user has attached ${files.length} files. Consider all of them in your response.)`,
    });
  } else if (leadingPrompt) {
    userParts.push({ text: leadingPrompt });
  }

  files.forEach((file, idx) => {
    if (files.length > 1) {
      userParts.push({ text: `[Attachment ${idx + 1} of ${files.length}: ${file.fileName}]` });
    }
    userParts.push({ inlineData: { data: file.base64, mimeType: file.mimeType } });
  });

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

const BUCKET = 'chat-uploads';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

/** Remove stored files for the given chat IDs */
async function removeStorageFiles(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'],
  chatIds: string[],
) {
  if (chatIds.length === 0) return;

  // Single query: pull every attachment path for messages in these chats
  const { data, error } = await supabase
    .from('messages')
    .select('message_attachments(file_url)')
    .in('chat_id', chatIds);

  if (error) {
    console.error('[chat-actions] removeStorageFiles read error:', error);
    throw new Error('Failed to enumerate chat attachments for deletion.');
  }

  type Row = { message_attachments: { file_url: string | null }[] | null };
  const paths = ((data ?? []) as Row[])
    .flatMap((row) => row.message_attachments ?? [])
    .map((a) => a.file_url)
    .filter((p): p is string => !!p);

  if (paths.length === 0) return;

  // Supabase storage limits batch removes; chunk to be safe.
  const CHUNK = 100;
  for (let i = 0; i < paths.length; i += CHUNK) {
    const slice = paths.slice(i, i + CHUNK);
    const { error: removeErr } = await supabase.storage.from(BUCKET).remove(slice);
    if (removeErr) {
      console.error('[chat-actions] removeStorageFiles remove error:', removeErr, {
        bucket: BUCKET,
        sample: slice.slice(0, 3),
      });
      throw new Error('Failed to delete chat attachments from storage.');
    }
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

/** Get messages (with attachments) for a chat */
export async function getMessages(chatId: string): Promise<MessageWithAttachments[]> {
  const { supabase } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      chat_id,
      role,
      content,
      created_at,
      attachments:message_attachments (
        id,
        message_id,
        file_url,
        file_mime_type,
        file_name,
        position,
        created_at
      )
    `)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[chat-actions] getMessages DB error:', error);
    throw new Error('Failed to load messages.');
  }

  const rows = (data ?? []) as (Message & { attachments: MessageAttachment[] | null })[];

  // Collect every storage path, then sign them all in a single batched call.
  const allPaths = Array.from(
    new Set(
      rows.flatMap((m) => (m.attachments ?? []).map((a) => a.file_url)).filter(Boolean) as string[]
    )
  );

  const signedMap = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signedData, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(allPaths, SIGNED_URL_EXPIRY);

    if (signErr) {
      console.error('[chat-actions] getMessages createSignedUrls error:', signErr);
    } else {
      for (const entry of signedData ?? []) {
        if (entry?.signedUrl && entry.path) {
          signedMap.set(entry.path, entry.signedUrl);
        }
      }
    }
  }

  return rows.map((msg) => {
    const atts = (msg.attachments ?? []).slice().sort((a, b) => a.position - b.position);
    return {
      id: msg.id,
      chat_id: msg.chat_id,
      role: msg.role,
      content: msg.content,
      created_at: msg.created_at,
      attachments: atts.map((a) => ({
        ...a,
        signedFileUrl: signedMap.get(a.file_url) ?? null,
      })),
    };
  });
}

/** Save a message, optionally with multiple attachments */
export async function saveMessage(
  chatId: string,
  role: 'user' | 'assistant',
  content: string,
  attachments: AttachmentRef[] = [],
): Promise<Message> {
  const { supabase, user } = await getAuthenticatedClient();

  const { data: msgData, error: msgErr } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, role, content })
    .select()
    .single();

  if (msgErr) throw new Error(msgErr.message);
  const message = msgData as Message;

  if (attachments.length > 0) {
    const rows = attachments.map((a, i) => ({
      message_id: message.id,
      file_url: a.storagePath,
      file_mime_type: a.mimeType,
      file_name: a.fileName,
      position: i,
    }));

    const { error: attErr } = await supabase.from('message_attachments').insert(rows);
    if (attErr) {
      console.error('[chat-actions] saveMessage attachment insert error:', attErr);
      throw new Error('Failed to save attachments.');
    }
  }

  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId)
    .eq('user_id', user.id);

  return message;
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
