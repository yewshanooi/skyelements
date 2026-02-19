'use server';

import { GoogleGenAI, Content } from "@google/genai";
import { OpenRouter } from "@openrouter/sdk";
import { createActionClient } from "@/utils/supabase/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
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
  created_at: string;
};

// ---------------------------------------------------------------------------
// AI Generation
// ---------------------------------------------------------------------------

export async function generateContent(
  prompt: string,
  model: string = "openrouter:arcee-ai/trinity-large-preview:free",
  history: ChatMessage[] = []
) {
  const isOpenRouter = model.startsWith("openrouter:");
  const actualModel = isOpenRouter ? model.replace("openrouter:", "") : model;

  if (isOpenRouter) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not set.");
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
        model: actualModel,
        messages,
        stream: true
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
    throw new Error("GOOGLE_API_KEY is not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  const contents: Content[] = [
    ...history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    } as Content)),
    { role: 'user', parts: [{ text: prompt }] } as Content
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

// ---------------------------------------------------------------------------
// Chat CRUD
// ---------------------------------------------------------------------------

/** Create a new chat and return it */
export async function createChat(model: string = 'openrouter:arcee-ai/trinity-large-preview:free'): Promise<Chat> {
  const { supabase, user } = await getAuthenticatedClient();

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
  const supabase = await createActionClient();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}

/** Save a message to a chat and bump the chat's updated_at timestamp */
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
