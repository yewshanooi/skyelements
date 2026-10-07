'use server';

import { GoogleGenAI, Content, ThinkingLevel, type ThinkingConfig } from '@google/genai';
import {
  ALLOWED_MODEL_IDS,
  DEFAULT_THINKING_EFFORT,
  normalizeThinkingEffort,
  type ThinkingEffort,
} from '@/lib/models';
import { getAuthenticatedClient } from '@/lib/supabase/server';
import { AI_TOOLS, executeAiTool } from './tools';
import {
  buildOptimizedAiHistory,
  buildAiSystemInstruction,
  resolveAttachmentMimeType,
  isSupportedMimeType,
  isValidUuid,
  MAX_INPUT_CHARS,
} from './context';
import type {
  AiChat,
  AiChatMessage,
  AiMessage,
  AiMessageWithAttachments,
  AiAttachment,
  AiAttachmentRef,
  AiFileAttachment,
  AiToolResult,
} from './types';

const BUCKET = 'chat-uploads';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

function isValidStoragePath(path: unknown, userId: string): boolean {
  if (typeof path !== 'string') return false;
  const trimmed = path.trim();
  const prefix = `${userId}/`;
  if (!trimmed.startsWith(prefix)) return false;
  if (trimmed.includes('..') || trimmed.includes('\\') || trimmed.includes('//')) return false;
  const fileName = trimmed.slice(prefix.length);
  if (!fileName || fileName.includes('/')) return false;
  return /^[a-zA-Z0-9_.-]+$/.test(fileName);
}

function sanitizeFileName(fileName: unknown): string {
  if (typeof fileName !== 'string') return 'attachment';
  const cleaned = fileName.replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '_').trim();
  return cleaned.slice(0, 255) || 'attachment';
}

const THINKING_LEVELS: Record<ThinkingEffort, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

function buildThinkingConfig(model: string, effort: unknown): ThinkingConfig {
  const normalizedEffort = normalizeThinkingEffort(model, effort);
  return { thinkingLevel: THINKING_LEVELS[normalizedEffort] };
}

let _aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY is not configured in environment variables');
  if (!_aiClient) _aiClient = new GoogleGenAI({ apiKey: key });
  return _aiClient;
}

// ---------------------------------------------------------------------------
// AI Response Generation Pipeline (Multi-Turn + Deterministic Tools)
// ---------------------------------------------------------------------------

export interface GenerateAiResult {
  text: string;
  toolResults?: AiToolResult[];
}

export async function generateAiResponse(
  prompt: string,
  model: string = 'gemini-3.5-flash-lite',
  history: AiChatMessage[] = [],
  attachments: AiAttachmentRef[] = [],
  effort: ThinkingEffort = DEFAULT_THINKING_EFFORT,
): Promise<GenerateAiResult> {
  const { supabase, user } = await getAuthenticatedClient();

  if (!ALLOWED_MODEL_IDS.has(model)) {
    return { text: 'Sorry, the requested model is not available.' };
  }

  // 1. Enforce strict server-side bounds against DoS and token exhaustion
  const sanitizedPrompt = typeof prompt === 'string' ? prompt.slice(0, MAX_INPUT_CHARS) : '';
  const boundedHistory = Array.isArray(history) ? history.slice(-100) : [];
  const boundedAttachments = Array.isArray(attachments) ? attachments.slice(0, 5) : [];

  // 2. Sliding-window history optimization
  const optimizedHistory = buildOptimizedAiHistory(boundedHistory, model);

  // 3. Fetch attachments from Supabase storage if provided with strict path & MIME validation
  const files: AiFileAttachment[] = [];
  if (boundedAttachments.length > 0) {
    const downloads = await Promise.all(
      boundedAttachments.map(async (att) => {
        if (!isValidStoragePath(att.storagePath, user.id)) {
          console.warn('[AI Actions] Blocked invalid or unauthorized attachment path:', att.storagePath);
          return null;
        }

        const safeFileName = sanitizeFileName(att.fileName);
        const resolvedMime = resolveAttachmentMimeType(safeFileName, att.mimeType);
        if (!isSupportedMimeType(resolvedMime)) {
          console.warn('[AI Actions] Blocked unsupported attachment MIME type:', resolvedMime);
          return null;
        }

        const { data, error } = await supabase.storage.from(BUCKET).download(att.storagePath);
        if (error || !data) {
          console.error('[AI Actions] Failed to download attachment:', att.storagePath, error);
          return null;
        }
        const arrayBuffer = await data.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return { base64, mimeType: resolvedMime, fileName: safeFileName } as AiFileAttachment;
      })
    );

    for (const f of downloads) {
      if (f) files.push(f);
    }
  }

  const ai = getAIClient();

  // 4. Assemble Gemini contents array
  const contents: Content[] = [
    ...optimizedHistory.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof msg.content === 'string' ? msg.content.slice(0, 20000) : '' }],
    } as Content)),
  ];

  const userParts: Content['parts'] = [];
  let leadingPrompt = sanitizedPrompt;
  if (!leadingPrompt && files.length > 0) {
    const allImages = files.every((f) => f.mimeType.startsWith('image/'));
    leadingPrompt = allImages ? 'Describe these images.' : 'Analyze these attached documents.';
  }

  if (files.length > 1) {
    userParts.push({
      text: `${leadingPrompt}\n\n(The user attached ${files.length} files. Take all of them into consideration.)`,
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

  // 5. System instruction with profile context & calendar anchors
  const displayName = typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name.trim() : '';
  const customInstruction = typeof user.user_metadata?.system_instruction === 'string' ? user.user_metadata.system_instruction.trim() : '';
  const systemInstruction = buildAiSystemInstruction(displayName, customInstruction);
  const thinkingConfig = buildThinkingConfig(model, effort);

  const toolResultsAccumulator: AiToolResult[] = [];
  const maxToolRounds = 5;

  const generateResponse = () => ai.models.generateContent({
    model,
    contents,
    config: {
      ...(thinkingConfig ? { thinkingConfig } : {}),
      systemInstruction,
      tools: [{ functionDeclarations: AI_TOOLS as any }],
    },
  });

  try {
    let response = await generateResponse();

    for (let round = 0; round < maxToolRounds; round += 1) {
      const candidate = response.candidates?.[0];
      const functionCalls = candidate?.content?.parts
        ?.filter((part: any) => Boolean(part.functionCall))
        .map((part: any) => part.functionCall);

      if (!functionCalls || functionCalls.length === 0) {
        return {
          text: response.text || "I'm ready to help with your Notes and Sales.",
          toolResults: toolResultsAccumulator,
        };
      }

      const toolExecutions = await Promise.all(
        functionCalls.map(async (call: any) => {
          const toolRes = await executeAiTool(
            call.name,
            (call.args as Record<string, unknown>) || {},
            supabase,
            user.id
          );
          return {
            toolRes,
            responsePart: {
              functionResponse: {
                ...(call.id ? { id: call.id } : {}),
                name: call.name,
                response: toolRes.output,
              },
            },
          };
        })
      );

      contents.push({
        role: 'model',
        parts: candidate?.content?.parts || [],
      } as Content);
      contents.push({
        role: 'user',
        parts: toolExecutions.map(({ responsePart }) => responsePart),
      } as Content);
      toolResultsAccumulator.push(...toolExecutions.map(({ toolRes }) => toolRes));

      // Keep tools enabled so the model can complete dependent workflows such
      // as finding a note, reading it, and then updating it.
      response = await generateResponse();
    }

    const lastOutput = toolResultsAccumulator.at(-1)?.output;
    const outputMessage =
      lastOutput && typeof lastOutput === 'object' && 'message' in lastOutput &&
      typeof lastOutput.message === 'string'
        ? lastOutput.message
        : null;

    return {
      text: response.text || outputMessage ||
        'The requested tools completed, but I could not generate a final response. Please try again.',
      toolResults: toolResultsAccumulator,
    };
  } catch (error: any) {
    console.error('[AI Actions] Error generating content:', error);

    if (error?.status === 429) {
      return {
        text: `⚠️ **Quota Exceeded**\n\nThe free quota for the ${model} model has been reached. Please switch to another model or try again later.`,
      };
    }
    if (error?.status === 503) {
      return {
        text: '⚠️ **Service Temporarily Unavailable**\n\nGoogle Gemini is experiencing heavy demand right now. Please try again in a few moments.',
      };
    }
    return {
      text: "Sorry, I couldn't complete your request at this time. Please try again.",
    };
  }
}

// ---------------------------------------------------------------------------
// Database CRUD Operations for ai_chats, ai_messages, ai_attachments
// ---------------------------------------------------------------------------

/** Create a new AI chat conversation */
export async function createAiChat(
  titleOrModel: string = 'New chat',
  model?: string
): Promise<AiChat> {
  const { supabase, user } = await getAuthenticatedClient();

  let chatTitle = 'New chat';
  let chatModel = 'gemini-3.5-flash-lite';

  if (ALLOWED_MODEL_IDS.has(titleOrModel) && !model) {
    chatModel = titleOrModel;
  } else {
    chatTitle = typeof titleOrModel === 'string' && titleOrModel.trim()
      ? titleOrModel.trim().slice(0, 100)
      : 'New chat';
    chatModel = model && ALLOWED_MODEL_IDS.has(model) ? model : 'gemini-3.5-flash-lite';
  }

  const { data, error } = await supabase
    .from('ai_chats')
    .insert({ user_id: user.id, model: chatModel, title: chatTitle })
    .select()
    .single();

  if (error) {
    console.error('[AI Actions] createAiChat error:', error);
    throw new Error('Failed to create chat.');
  }

  return data as AiChat;
}

/** List all AI chats for the authenticated user */
export async function listAiChats(): Promise<AiChat[]> {
  const { supabase, user } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from('ai_chats')
    .select('id, user_id, title, model, is_pinned, created_at, updated_at')
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[AI Actions] listAiChats error:', error);
    throw new Error('Failed to load chats.');
  }

  return (data ?? []) as AiChat[];
}

/** Get messages with signed attachments for a chat */
export async function getAiMessages(chatId: string): Promise<AiMessageWithAttachments[]> {
  const { supabase, user } = await getAuthenticatedClient();

  if (!isValidUuid(chatId)) {
    throw new Error('Invalid chat ID');
  }

  // Explicit ownership verification for defense-in-depth
  const { data: chat, error: chatErr } = await supabase
    .from('ai_chats')
    .select('id')
    .eq('id', chatId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (chatErr || !chat) {
    throw new Error('Chat not found or access denied.');
  }

  const { data, error } = await supabase
    .from('ai_messages')
    .select(`
      id,
      chat_id,
      role,
      content,
      tool_calls,
      created_at,
      attachments:ai_attachments (
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
    console.error('[AI Actions] getAiMessages error:', error);
    throw new Error('Failed to load messages.');
  }

  const rows = (data ?? []) as (AiMessage & { attachments: AiAttachment[] | null })[];

  // Batch sign attachment URLs - strictly validating that each path belongs to the current user
  const allPaths = Array.from(
    new Set(
      rows
        .flatMap((m) => (m.attachments ?? []).map((a) => a.file_url))
        .filter((p): p is string => isValidStoragePath(p, user.id))
    )
  );

  const signedMap = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signedData, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(allPaths, SIGNED_URL_EXPIRY);

    if (!signErr && signedData) {
      for (const entry of signedData) {
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
      tool_calls: msg.tool_calls,
      created_at: msg.created_at,
      attachments: atts.map((a) => ({
        ...a,
        signedFileUrl: signedMap.get(a.file_url) ?? null,
      })),
    };
  });
}

/** Save a message and any uploaded attachments to the database */
export async function saveAiMessage(
  chatId: string,
  role: 'user' | 'assistant',
  content: string,
  toolCalls?: any[],
  attachments: AiAttachmentRef[] = [],
): Promise<AiMessage> {
  const { supabase, user } = await getAuthenticatedClient();

  if (!isValidUuid(chatId)) {
    throw new Error('Invalid chat ID');
  }

  if (role !== 'user' && role !== 'assistant') {
    throw new Error('Invalid message role');
  }

  // Explicit chat ownership check before inserting
  const { data: chat, error: chatErr } = await supabase
    .from('ai_chats')
    .select('id')
    .eq('id', chatId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (chatErr || !chat) {
    throw new Error('Chat not found or access denied.');
  }

  const safeContent = typeof content === 'string' ? content.slice(0, 50000) : '';

  const { data: msgData, error: msgErr } = await supabase
    .from('ai_messages')
    .insert({
      chat_id: chatId,
      role,
      content: safeContent,
      tool_calls: Array.isArray(toolCalls) && toolCalls.length > 0 ? toolCalls.slice(0, 20) : [],
    })
    .select()
    .single();

  if (msgErr) {
    console.error('[AI Actions] saveAiMessage error:', msgErr);
    throw new Error(msgErr.message);
  }

  const message = msgData as AiMessage;

  // Insert attachments if any with strict storage path & MIME validation
  if (Array.isArray(attachments) && attachments.length > 0) {
    const validAttachments = attachments
      .slice(0, 5)
      .filter((att) => isValidStoragePath(att.storagePath, user.id));

    if (validAttachments.length > 0) {
      const attachmentRows = validAttachments.map((att, idx) => ({
        message_id: message.id,
        file_url: att.storagePath,
        file_mime_type: resolveAttachmentMimeType(att.fileName, att.mimeType),
        file_name: sanitizeFileName(att.fileName),
        position: idx,
      }));

      const { error: attErr } = await supabase.from('ai_attachments').insert(attachmentRows);
      if (attErr) {
        console.error('[AI Actions] attachment insert error:', attErr);
      }
    }
  }

  // Update chat updated_at scoped to current user
  await supabase
    .from('ai_chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId)
    .eq('user_id', user.id);

  return message;
}

/** Toggle pin state on chat */
export async function togglePinAiChat(chatId: string, isPinned: boolean): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  if (!isValidUuid(chatId)) return;

  const { error } = await supabase
    .from('ai_chats')
    .update({ is_pinned: Boolean(isPinned) })
    .eq('id', chatId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[AI Actions] togglePinAiChat error:', error);
    throw new Error('Failed to update pin status.');
  }
}

/** Remove stored files from chat-uploads for given chat IDs strictly owned by user */
async function removeAiStorageFiles(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'],
  userId: string,
  chatIds: string[],
) {
  const validChatIds = chatIds.filter(isValidUuid);
  if (validChatIds.length === 0) return;

  const { data, error } = await supabase
    .from('ai_messages')
    .select('ai_attachments(file_url)')
    .in('chat_id', validChatIds);

  if (error || !data) return;

  type Row = { ai_attachments: { file_url: string | null }[] | null };
  const paths = ((data ?? []) as unknown as Row[])
    .flatMap((row) => row.ai_attachments ?? [])
    .map((a) => a.file_url)
    .filter((p): p is string => isValidStoragePath(p, userId));

  if (paths.length === 0) return;

  const CHUNK = 100;
  for (let i = 0; i < paths.length; i += CHUNK) {
    const slice = paths.slice(i, i + CHUNK);
    await supabase.storage.from(BUCKET).remove(slice);
  }
}

/** Delete a single AI chat and its storage files */
export async function deleteAiChat(chatId: string): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  if (!isValidUuid(chatId)) {
    throw new Error('Invalid chat ID');
  }

  await removeAiStorageFiles(supabase, user.id, [chatId]);

  const { error } = await supabase
    .from('ai_chats')
    .delete()
    .eq('id', chatId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[AI Actions] deleteAiChat error:', error);
    throw new Error('Failed to delete chat.');
  }
}

/** Delete all AI chats for user and their storage files */
export async function deleteAllAiChats(): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  const { data: chats } = await supabase
    .from('ai_chats')
    .select('id')
    .eq('user_id', user.id);

  const chatIds = (chats ?? []).map((c) => c.id).filter(isValidUuid);
  await removeAiStorageFiles(supabase, user.id, chatIds);

  const { error } = await supabase.from('ai_chats').delete().eq('user_id', user.id);

  if (error) {
    console.error('[AI Actions] deleteAllAiChats error:', error);
    throw new Error('Failed to delete all chats.');
  }
}

