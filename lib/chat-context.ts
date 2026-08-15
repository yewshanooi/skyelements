import type { ChatMessage } from "@/app/lithium/chat-actions";

// ---------------------------------------------------------------------------
// File type support (for chat attachments)
// ---------------------------------------------------------------------------

const SUPPORTED_FILE_TYPES: Record<string, string[]> = {
  // Images
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],

  // Documents
  'application/pdf': ['.pdf'],
  
  // Text/Code
  'text/plain': ['.txt', '.md', '.csv', '.log'],
  'text/html': ['.html', '.htm'],
  'text/css': ['.css'],
  'text/javascript': ['.js', '.mjs'],
  'application/json': ['.json'],
  'application/xml': ['.xml'],
  'text/x-python': ['.py'],
  'text/x-java': ['.java'],
  'text/x-c': ['.c', '.h'],
  'text/x-c++': ['.cpp', '.hpp', '.cc'],
  'text/x-typescript': ['.ts', '.tsx'],
};

export const SUPPORTED_MIME_TYPES = Object.keys(SUPPORTED_FILE_TYPES);

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Approximate characters-per-token ratio (conservative for English text).
const CHARS_PER_TOKEN = 4;

// Per-model token budgets for conversation history (not counting the new prompt).
const MODEL_CONTEXT_BUDGETS: Record<string, number> = {
  'gemini-3.5-flash-lite': 16_000,
  'gemini-3.6-flash': 32_000,
  'gemini-3.7-flash': 32_000,

  default: 16_000,
};

// Maximum characters allowed for a single message in history before truncation.
const MAX_MESSAGE_CHARS = 6_000;

// Maximum characters allowed for user input (enforced client-side).
export const MAX_INPUT_CHARS = 10_000;

// Minimum number of recent messages to always keep (even if over budget).
const MIN_RECENT_MESSAGES = 4;

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

// Rough token count estimate for a string.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// ---------------------------------------------------------------------------
// Message truncation
// ---------------------------------------------------------------------------

// Truncate a single message if it exceeds the character limit.
function truncateMessage(content: string, maxChars: number = MAX_MESSAGE_CHARS): string {
  if (content.length <= maxChars) return content;

  // Keep the beginning and end for context continuity
  const headSize = Math.floor(maxChars * 0.7);
  const tailSize = Math.floor(maxChars * 0.2);
  const head = content.slice(0, headSize);
  const tail = content.slice(-tailSize);

  return `${head}\n\n[... content truncated for context efficiency ...]\n\n${tail}`;
}

// ---------------------------------------------------------------------------
// Sliding window with summarization
// ---------------------------------------------------------------------------

export function buildOptimizedHistory(
  fullHistory: ChatMessage[],
  model: string,
): ChatMessage[] {
  if (fullHistory.length === 0) return [];

  const budget = MODEL_CONTEXT_BUDGETS[model] ?? MODEL_CONTEXT_BUDGETS.default;

  // Truncate individual messages first
  const truncated: ChatMessage[] = fullHistory.map(msg => ({
    ...msg,
    content: truncateMessage(msg.content),
  }));

  // Always keep the last MIN_RECENT_MESSAGES
  const guaranteed = truncated.slice(-MIN_RECENT_MESSAGES);
  const older = truncated.slice(0, -MIN_RECENT_MESSAGES);

  // Calculate tokens used by guaranteed messages
  let usedTokens = guaranteed.reduce((sum, m) => sum + estimateTokens(m.content), 0);

  // Walk backwards through older messages, adding what fits
  const included: ChatMessage[] = [];
  for (let i = older.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(older[i].content);
    if (usedTokens + msgTokens > budget) break;
    included.unshift(older[i]);
    usedTokens += msgTokens;
  }

  const droppedCount = older.length - included.length;

  // If we dropped messages, add a context summary note
  if (droppedCount > 0) {
    const summaryNote: ChatMessage = {
      role: 'user',
      content: `[System note: ${droppedCount} earlier message${droppedCount > 1 ? 's' : ''} in this conversation ${droppedCount > 1 ? 'have' : 'has'} been omitted for context efficiency. The conversation continues from the most relevant recent messages below.]`,
    };
    return [summaryNote, ...included, ...guaranteed];
  }

  return [...included, ...guaranteed];
}
