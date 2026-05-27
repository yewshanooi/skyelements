'use server';

import { GoogleGenAI, Content } from "@google/genai";
import { OpenRouter } from "@openrouter/sdk";
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

export type ImageAttachment = {
  base64: string;
  mimeType: string;
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
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string | null;
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
  imageStoragePath?: string,
  fileStoragePath?: string,
  fileMimeType?: string,
) {
  const { supabase } = await getAuthenticatedClient();

  if (!ALLOWED_MODEL_IDS.has(model)) {
    return "Sorry, the requested model is not available.";
  }

  const isOpenRouter = model.startsWith("openrouter:");
  const actualModel = isOpenRouter ? model.replace("openrouter:", "") : model;

  if ((imageStoragePath || fileStoragePath) && isOpenRouter) {
    return "Sorry, file upload is not supported for this model.";
  }

  // Optimize history to fit within model context budget
  const optimizedHistory = buildOptimizedHistory(history, model);

  // Download image and file from storage in parallel
  let image: ImageAttachment | undefined;
  let file: FileAttachment | undefined;

  const downloadTasks: Promise<void>[] = [];

  if (imageStoragePath) {
    downloadTasks.push(
      supabase.storage.from(BUCKET).download(imageStoragePath).then(async ({ data, error }) => {
        if (error || !data) {
          console.error('Failed to download image from storage:', error);
          return;
        }
        const arrayBuffer = await data.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = data.type || 'image/png';
        image = { base64, mimeType };
      })
    );
  }

  if (fileStoragePath && fileMimeType) {
    downloadTasks.push(
      supabase.storage.from(BUCKET).download(fileStoragePath).then(async ({ data, error }) => {
        if (error || !data) {
          console.error('Failed to download file from storage:', error);
          return;
        }
        const arrayBuffer = await data.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const fileName = fileStoragePath.split('/').pop() || 'file';
        file = { base64, mimeType: fileMimeType, fileName };
      })
    );
  }

  await Promise.all(downloadTasks);

  // Bail if downloads failed
  if (imageStoragePath && !image) {
    return "Sorry, I couldn't process the attached image.";
  }
  if (fileStoragePath && fileMimeType && !file) {
    return "Sorry, I couldn't process the attached file.";
  }

  if (isOpenRouter) {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY environment variable is not set.");

      return "Sorry, I couldn't generate a response at this time.";
    }

    const openrouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY
    });

    const messages = [
      ...optimizedHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: prompt }
    ];

    try {
      const stream = await openrouter.chat.send({
        chatGenerationParams: {
          model: actualModel,
          messages: messages,
          stream: true
        }
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
        }
      }

      return fullResponse;
    } catch (error: any) {
      console.error("Error generating content:", error);

      if (error?.statusCode === 429) {
        return `⚠️ **Rate Limited**\n\nWe've being rate limited for the ${actualModel} model. Please change to another model or try again later.`;
      }

      if (error?.statusCode === 500) {
        return '⚠️ **Service Unavailable**\n\nThe model provider is currently experiencing issues. Please try again later.';
      }

      return "Sorry, I couldn't generate a response at this time.";
    }
  }

  // Google AI Studio models
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

  if (image) {
    userParts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
  }

  if (file) {
    userParts.push({ inlineData: { data: file.base64, mimeType: file.mimeType } });
  }

  userParts.push({ text: prompt || (image ? 'What is in this image?' : file ? 'Analyze this file.' : '') });

  contents.push({ role: 'user', parts: userParts } as Content);

  try {
    const response = await ai.models.generateContent({
      model: actualModel,
      contents,
    });
    return response.text;
  } catch (error: any) {
    console.error("Error generating content:", error);

    if (error?.status === 429) {
      return `⚠️ **Free Quota Exceeded**\n\nWe've hit the daily free quota for the ${actualModel} model. Please change to another model or try again tomorrow.`;
    }

    if (error?.status === 503) {
      return '⚠️ **Service Unavailable**\n\nThis model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.';
    }

    return "Sorry, I couldn't generate a response at this time.";
  }
}

// ---------------------------------------------------------------------------
// Image Storage Helpers
// ---------------------------------------------------------------------------

const BUCKET = 'chat-images';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

/** Generate a signed URL for a stored image */
async function getSignedImageUrl(storagePath: string): Promise<string | null> {
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

/** Remove stored images and files for the given chat IDs */
async function removeStorageImages(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'],
  chatIds: string[],
) {
  if (chatIds.length === 0) return;

  const { data: msgs } = await supabase
    .from('messages')
    .select('image_url, file_url')
    .in('chat_id', chatIds)
    .or('image_url.not.is.null,file_url.not.is.null');

  const paths = (msgs ?? [])
    .flatMap((m: { image_url?: string | null; file_url?: string | null }) => [m.image_url, m.file_url])
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
    .select('id, title, model, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[chat-actions] listChats DB error:', error);
    throw new Error('Failed to load chats.');
  }

  return (data ?? []) as Chat[];
}

/** Get messages for a chat */
export async function getMessages(chatId: string): Promise<(Message & { signedImageUrl?: string | null; signedFileUrl?: string | null })[]> {
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

  // Generate signed URLs for messages that have images or files
  const enriched = await Promise.all(
    messages.map(async (msg) => {
      let signedImageUrl: string | null = null;
      let signedFileUrl: string | null = null;

      if (msg.image_url) {
        signedImageUrl = await getSignedImageUrl(msg.image_url);
      }
      if (msg.file_url) {
        signedFileUrl = await getSignedImageUrl(msg.file_url); // same bucket, same function
      }

      return { ...msg, signedImageUrl, signedFileUrl };
    })
  );

  return enriched;
}

/** Save a message to a chat */
export async function saveMessage(
  chatId: string,
  role: 'user' | 'assistant',
  content: string,
  imageUrl?: string | null,
  fileUrl?: string | null,
  fileMimeType?: string | null,
  fileName?: string | null,
): Promise<Message> {
  const { supabase, user } = await getAuthenticatedClient();

  const insertData: Record<string, unknown> = { chat_id: chatId, role, content };
  if (imageUrl) insertData.image_url = imageUrl;
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

/** Delete a chat */
export async function deleteChat(chatId: string): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  await removeStorageImages(supabase, [chatId]);

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
  await removeStorageImages(supabase, chatIds);

  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('[chat-actions] deleteAllChats DB error:', error);
    throw new Error('Failed to delete chats.');
  }
}
