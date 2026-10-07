export type AiRole = 'user' | 'assistant';

export interface AiChat {
  id: string;
  user_id: string;
  title: string;
  model: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_mime_type: string;
  file_name: string;
  position: number;
  created_at: string;
  signedFileUrl?: string | null;
}

export interface AiToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface AiMessage {
  id: string;
  chat_id: string;
  role: AiRole;
  content: string;
  tool_calls?: AiToolCallRecord[] | null;
  created_at: string;
}

export type AiMessageWithAttachments = AiMessage & {
  attachments: AiAttachment[];
};

export interface AiChatMessage {
  role: AiRole;
  content: string;
}

export interface AiAttachmentRef {
  storagePath: string;
  mimeType: string;
  fileName: string;
}

export interface AiFileAttachment {
  base64: string;
  mimeType: string;
  fileName: string;
}

export interface AiToolResult {
  toolName: string;
  output: unknown;
  card?: {
    type: 'notes_list' | 'note_created' | 'sale_created';
    title: string;
    data: unknown;
  };
}
