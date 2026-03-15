'use server';

import { GoogleGenAI, Content } from "@google/genai";
import { OpenRouter } from "@openrouter/sdk";
import { createActionClient } from "@/utils/supabase/actions";
import { ALLOWED_MODEL_IDS } from "@/lib/models";

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
  image_path?: string | null;
  image_url?: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// AI Generation
// ---------------------------------------------------------------------------

export async function generateContent(
  prompt: string,
  model: string = "gemini-3.1-flash-lite-preview",
  history: ChatMessage[] = [],
  image?: ImageAttachment
) {
  await getAuthenticatedClient();

  if (!ALLOWED_MODEL_IDS.has(model)) {
    return "Sorry, the requested model is not available.";
  }

  const isOpenRouter = model.startsWith("openrouter:");
  const actualModel = isOpenRouter ? model.replace("openrouter:", "") : model;

  if (isOpenRouter) {
    if (image) {
      return "Sorry, image upload is not supported for this model.";
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY environment variable is not set.");

      return "Sorry, I couldn't generate a response at this time.";
    }

    const openrouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY
    });

    const messages = [
      ...history.map(msg => ({
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
        const errorBody = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
        return `⚠️ **${errorBody?.error?.message}**\n\n${errorBody?.error?.metadata?.raw}`;
      }

      if (error?.statusCode === 500) {
        return '⚠️ **Internal server error**';
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
  
  const aiParts: any[] = [];
  if (image) {
    aiParts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
  }
  const promptText = prompt || (image ? 'What is in this image?' : '');
  if (promptText) {
    aiParts.push({ text: promptText });
  }

  const contents: Content[] = [
    ...history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    } as Content)),
    { role: 'user', parts: aiParts } as Content
  ];

  try {
    const response = await ai.models.generateContent({
      model: actualModel,
      contents,
    });
    return response.text;
  } catch (error: any) {
    console.error("Error generating content:", error);

    if (error?.status === 429) {
      return `⚠️ **Free quota exceeded**\n\nWe've hit the daily free quota for the ${actualModel} model. Please change to another model or try again tomorrow.`;
    }

    return "Sorry, I couldn't generate a response at this time.";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthenticatedClient() {
  const supabase = await createActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { supabase, user };
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/** Upload an image to Supabase Storage and return the storage path */
export async function uploadChatImage(
  chatId: string,
  base64: string,
  mimeType: string
): Promise<string> {
  const { supabase, user } = await getAuthenticatedClient();

  const ext = MIME_TO_EXT[mimeType] || 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${user.id}/${chatId}/${fileName}`;

  const buffer = Buffer.from(base64, 'base64');

  const { error } = await supabase.storage
    .from('chat-images')
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  return storagePath;
}

// ---------------------------------------------------------------------------
// Chat CRUD
// ---------------------------------------------------------------------------

/** Create a new chat and return it */
export async function createChat(model: string = 'gemini-3.1-flash-lite-preview'): Promise<Chat> {
  if (!ALLOWED_MODEL_IDS.has(model)) {
    throw new Error('Invalid model specified.');
  }

  const { supabase, user } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from('chats')
    .insert({ user_id: user.id, model, title: 'New chat' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Chat;
}

/** List all chats for the current user, newest first */
export async function listChats(): Promise<Chat[]> {
  const { supabase, user } = await getAuthenticatedClient();

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
  const { supabase, user } = await getAuthenticatedClient();

  const { data: chat } = await supabase
    .from('chats')
    .select('id')
    .eq('id', chatId)
    .eq('user_id', user.id)
    .single();

  if (!chat) throw new Error('Chat not found or access denied');

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const messages = (data ?? []) as Message[];

  // Generate signed URLs for messages with images
  const messagesWithImages = messages.filter(m => m.image_path);
  if (messagesWithImages.length > 0) {
    const paths = messagesWithImages.map(m => m.image_path!);
    const { data: signedUrls, error: signedUrlsError } = await supabase.storage
      .from('chat-images')
      .createSignedUrls(paths, 3600); // 1 hour
      
    if (!signedUrlsError && signedUrls) {
      for (const msg of messagesWithImages) {
        const signedUrlData = signedUrls.find(s => s.path === msg.image_path);
        if (signedUrlData && !signedUrlData.error) {
          msg.image_url = signedUrlData.signedUrl;
        }
      }
    }
  }

  return messages;
}

/** Save a message to a chat and bump the chat's updated_at timestamp */
export async function saveMessage(chatId: string, role: 'user' | 'assistant', content: string, imagePath?: string): Promise<Message> {
  const { supabase, user } = await getAuthenticatedClient();

  const { data: chat } = await supabase
    .from('chats')
    .select('id')
    .eq('id', chatId)
    .eq('user_id', user.id)
    .single();

  if (!chat) throw new Error('Chat not found or access denied');

  const insertData: Record<string, string> = { chat_id: chatId, role, content };
  if (imagePath) insertData.image_path = imagePath;

  const { data, error } = await supabase
    .from('messages')
    .insert(insertData)
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
  const { supabase, user } = await getAuthenticatedClient();

  const { error } = await supabase
    .from('chats')
    .update({ title })
    .eq('id', chatId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
}

/** Delete a chat */
export async function deleteChat(chatId: string): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  // Remove images from storage
  const folder = `${user.id}/${chatId}`;
  const { data: files } = await supabase.storage
    .from('chat-images')
    .list(folder);
  if (files && files.length > 0) {
    await supabase.storage
      .from('chat-images')
      .remove(files.map(f => `${folder}/${f.name}`));
  }

  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
}

/** Delete all chats for the current user */
export async function deleteAllChats(): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  // Remove all images from storage for this user
  const userFolder = user.id;
  const { data: chatFolders } = await supabase.storage
    .from('chat-images')
    .list(userFolder);
  if (chatFolders && chatFolders.length > 0) {
    const allPaths: string[] = [];
    
    await Promise.all(chatFolders.map(async (folder) => {
      const subPath = `${userFolder}/${folder.name}`;
      const { data: files } = await supabase.storage
        .from('chat-images')
        .list(subPath);
      if (files && files.length > 0) {
        allPaths.push(...files.map(f => `${subPath}/${f.name}`));
      }
    }));
    
    if (allPaths.length > 0) {
      await supabase.storage
        .from('chat-images')
        .remove(allPaths);
    }
  }

  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
}
