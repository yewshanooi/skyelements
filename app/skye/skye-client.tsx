'use client';

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpIcon,
  Gauge,
  CheckIcon,
  ChevronDown,
  CopyIcon,
  Paperclip,
  FileText,
  X,
  SearchIcon,
  BookOpen,
  FilePlus2,
  PenLine,
  BarChart3,
  ShoppingCart,
  List,
  Mic,
  MicOff,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Bubble, BubbleContent, BubbleReactions } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { LoadingBar } from "@/components/ui/loading-bar";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import {
  createAiChat,
  listAiChats,
  getAiMessages,
  saveAiMessage,
  togglePinAiChat,
  deleteAiChat,
  generateAiResponse,
} from "@/lib/ai/actions";
import type {
  AiChat,
  AiAttachmentRef,
  AiChatMessage,
  AiToolResult,
} from "@/lib/ai/types";
import {
  isImageMimeType,
  isSupportedMimeType,
  isSupportedFileExtension,
  SUPPORTED_FILE_ACCEPT,
  MAX_INPUT_CHARS,
} from "@/lib/ai/context";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_THINKING_EFFORT,
  getThinkingOptions,
  MODELS,
  THINKING_EFFORT_PREFERENCE_KEY,
  isThinkingEffort,
  type ThinkingEffort,
} from "@/lib/models";
import type { UserProfile } from "@/lib/profile";
import { SkyeSidebar } from "./skye-sidebar";

// ---------------------------------------------------------------------------
// Helpers & Types
// ---------------------------------------------------------------------------

type SpeechRecognitionResultLike = {
  [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const formatBytes = (bytes: number, decimals = 1) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileMetaLabel = (fileName: string, size?: number) => {
  const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
  const sizeStr = size !== undefined ? formatBytes(size) : '';
  return sizeStr ? `${ext} · ${sizeStr}` : ext;
};

const getFileDisplayName = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot > 0) {
    return fileName.slice(0, lastDot);
  }
  return fileName;
};

const getSafeAttachmentUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  const trimmed = url.trim();
  // Strictly allow only http, https, or blob protocols to prevent javascript: and data: XSS vectors
  if (/^(?:https?:\/\/|blob:)/i.test(trimmed)) {
    return trimmed;
  }
  return undefined;
};

const compressImage = (imgFile: File): Promise<{ blob: Blob; previewUrl: string }> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(imgFile);
    const img = new window.Image();
    img.onload = () => {
      const MAX_DIM = 2048;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          canvas.width = 0;
          canvas.height = 0;
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }
          const previewUrl = URL.createObjectURL(blob);
          resolve({ blob, previewUrl });
        },
        'image/webp',
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
};

function sortByPinned<T extends { is_pinned: boolean; updated_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

type PendingAttachment = {
  id: string;
  file: File;
  fileName: string;
  mimeType: string;
  previewUrl: string | null;
  state: "uploading" | "done" | "error";
  uploadedPath?: string;
  errorMessage?: string;
};

type DisplayAttachment = {
  fileUrl: string | null;
  fileName: string;
  fileMimeType: string;
};

type DisplayMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: AiToolResult[];
  attachments: DisplayAttachment[];
};

const greetings = [
  "Let's get started.",

  "Ready when you are.",
  "Ready to get started?",
  "Ready to create something?",

  "Where to begin?",
  "Where should we begin?",
  "Where do you want to start?",

  "What can I do for you?",
  "What are you working on?",
  "What do you want to know?",
  "What would you like to explore?",
  "What can I help you with today?",

  "What's your focus today?",
  "What's on your mind today?",
  "What's on the agenda today?",

  "How can I help?",
  "How can I help you right now?",
];

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_ATTACHMENTS = 5;
const PREVIEW_LENGTH = 200;

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

// ---------------------------------------------------------------------------
// Tool Result Card Renderers
// ---------------------------------------------------------------------------

function ToolResultCard({ card }: { card: NonNullable<AiToolResult['card']> }) {
  if (card.type === 'notes_list') {
    const notes = Array.isArray(card.data) ? card.data : [];
    return (
      <div className="my-2.5 p-3 rounded-xl border border-border/70 bg-card/70 max-w-xl text-xs space-y-2">
        <div className="font-semibold text-foreground flex items-center justify-between">
          <span>{card.title}</span>
          <Link href="/notes" className="text-primary hover:underline flex items-center gap-1 text-[11px]">
            Open Notes <ExternalLink className="size-3" />
          </Link>
        </div>
        {notes.length === 0 ? (
          <p className="text-muted-foreground">No notes found.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {notes.slice(0, 5).map((n: any) => (
              <div key={n.id} className="py-1.5 flex items-center justify-between">
                <span className="font-medium text-foreground truncate">{n.title || 'Untitled'}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                  {new Date(n.updated_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (card.type === 'note_created') {
    return (
      <div className="my-2.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 max-w-xl text-xs space-y-1.5">
        <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            {card.title}
          </span>
          <Link href="/notes" className="text-primary hover:underline flex items-center gap-1 text-[11px]">
            View in Notes <ExternalLink className="size-3" />
          </Link>
        </div>
        <p className="text-muted-foreground text-[11px]">
          Created in your Notes app. You can view or edit it at any time.
        </p>
      </div>
    );
  }


  if (card.type === 'sale_created') {
    return (
      <div className="my-2.5 p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 max-w-xl text-xs space-y-1.5">
        <div className="font-semibold text-blue-700 dark:text-blue-400 flex items-center justify-between">
          <span>{card.title}</span>
          <Link href="/sales" className="text-primary hover:underline flex items-center gap-1 text-[11px]">
            View Dashboard <ExternalLink className="size-3" />
          </Link>
        </div>
        <p className="text-muted-foreground text-[11px]">
          Recorded into Sales Dashboard.
        </p>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// AI Tool Markers (e.g. "Reading note", "Searching sales")
// ---------------------------------------------------------------------------

interface ToolMarkerItem {
  label: string;
  tooltip: string;
  icon: LucideIcon;
}

const TOOL_LABELS: Record<string, { label: string; tooltip: string; icon: LucideIcon }> = {
  ai_read_note: { label: 'Reading note', tooltip: 'Skye read note details', icon: BookOpen },
  ai_list_notes: { label: 'Reading notes', tooltip: 'Skye checked your notes list', icon: List },
  ai_create_note: { label: 'Creating note', tooltip: 'Skye created a new note', icon: FilePlus2 },
  ai_update_note: { label: 'Updating note', tooltip: 'Skye updated a note', icon: PenLine },
  ai_search_sales: { label: 'Searching sales', tooltip: 'Skye searched sales records', icon: SearchIcon },
  ai_query_sales_metrics: { label: 'Searching sales', tooltip: 'Skye queried sales metrics', icon: BarChart3 },
  ai_create_sale: { label: 'Creating sale', tooltip: 'Skye recorded a new sale', icon: ShoppingCart },
};

function getAiToolMarkers(toolResults: AiToolResult[]): ToolMarkerItem[] {
  const seen = new Set<string>();
  const markers: ToolMarkerItem[] = [];

  for (const tr of toolResults) {
    const rawName = (tr.toolName || (tr as any).name || '').trim();
    const lowerName = rawName.toLowerCase();
    if (!lowerName.startsWith('ai_') || seen.has(lowerName)) continue;
    seen.add(lowerName);

    const known = TOOL_LABELS[lowerName];
    if (known) {
      markers.push({ label: known.label, tooltip: known.tooltip, icon: known.icon });
    } else {
      const words = rawName.replace(/^ai_/i, '').split('_');
      const verb = words[0];
      const rest = words.slice(1).join(' ');
      const gerund = verb.endsWith('e') ? `${verb.slice(0, -1)}ing` : `${verb}ing`;
      const label = `${gerund.charAt(0).toUpperCase() + gerund.slice(1)} ${rest}`.trim();
      markers.push({ label, tooltip: `Tool: ${rawName}`, icon: SearchIcon });
    }
  }

  return markers;
}

// ---------------------------------------------------------------------------
// Memoized Message Item (Matches previous Notes Chat UI style)
// ---------------------------------------------------------------------------

const MessageItem = memo(function MessageItem({ msg }: { msg: DisplayMessage }) {
  const isUser = msg.role === 'user';
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isLong = isUser && msg.content.length > PREVIEW_LENGTH;
  const preview = isLong ? `${msg.content.slice(0, PREVIEW_LENGTH)}…` : msg.content;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };


  return (
    <div className="flex flex-col">
      {/* User Attachments */}
      {msg.attachments.length > 0 && (
        <div className={`mb-2 max-w-full w-fit ${isUser ? 'self-end' : 'self-start'}`}>
          <AttachmentGroup>
            {msg.attachments.map((att, ai) => {
              const isImg = isImageMimeType(att.fileMimeType);
              const metaLabel = getFileMetaLabel(att.fileName);
              const safeUrl = getSafeAttachmentUrl(att.fileUrl);
              return (
                <Attachment key={ai} size="sm" className="w-60 max-w-full">
                  {isImg && att.fileUrl ? (
                    <AttachmentMedia variant="image">
                      <img src={att.fileUrl} alt={att.fileName} />
                    </AttachmentMedia>
                  ) : (
                    <AttachmentMedia>
                      <FileText className="size-4" />
                    </AttachmentMedia>
                  )}
                  <AttachmentContent>
                    <AttachmentTitle>{getFileDisplayName(att.fileName)}</AttachmentTitle>
                    <AttachmentDescription>{metaLabel}</AttachmentDescription>
                  </AttachmentContent>
                  {safeUrl && (
                    <AttachmentTrigger asChild>
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${att.fileName}`}
                      />
                    </AttachmentTrigger>
                  )}
                </Attachment>
              );
            })}
          </AttachmentGroup>
        </div>
      )}

      {/* Tool results if any */}
      {msg.toolResults?.map((tr, idx) => tr.card && (
        <div key={idx} className="mb-2 max-w-3xl">
          <ToolResultCard card={tr.card} />
        </div>
      ))}

      {msg.content.trim().length > 0 && (
        <Bubble
          variant={isUser ? 'tinted' : 'ghost'}
          align={isUser ? 'end' : 'start'}
          className={isUser ? 'pb-3 max-w-[90%] sm:max-w-[80%]' : 'pb-3'}
        >
          <BubbleContent className={`text-base rounded-2xl${isLong ? ' whitespace-pre-line' : ''}`}>
            {isUser ? (
              isLong ? (
                <Collapsible open={open} onOpenChange={setOpen}>
                  <div>
                    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
                      {open ? msg.content : preview}
                    </ReactMarkdown>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="link" className="gap-1 p-0 text-muted-foreground">
                      {open ? 'Show less' : 'Show more'}
                      <ChevronDown
                        data-icon="inline-end"
                        className={`transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              ) : (
                <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
                  {msg.content}
                </ReactMarkdown>
              )
            ) : (
              <div className="prose dark:prose-invert max-w-none overflow-x-auto overflow-y-hidden scrollbar-thin">
                <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            )}
          </BubbleContent>
          <BubbleReactions
            align={isUser ? 'end' : 'start'}
            aria-label="Copy actions"
            className={isUser
              ? 'transition-opacity sm:pointer-events-none sm:opacity-0 sm:group-hover/bubble:pointer-events-auto sm:group-hover/bubble:opacity-100 sm:group-focus-within/bubble:pointer-events-auto sm:group-focus-within/bubble:opacity-100'
              : undefined}
          >
            <Button
              variant="ghost"
              size="xs"
              onClick={handleCopy}
              aria-label={copied ? 'Copied' : 'Copy'}
              title="Copy"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </BubbleReactions>
        </Bubble>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Memoized Input Area Component (Matching previous Chats UI structure)
// ---------------------------------------------------------------------------

const InputArea = memo(function InputArea({
  prompt,
  loading,
  pendingAttachments,
  attachmentError,
  selectedModelInfo,
  setSelectedModel,
  effort,
  setEffort,
  isDraggingOver,
  fileInputRef,
  onPromptChange,
  onKeyDown,
  onPaste,
  onSend,
  isVoiceInputSupported,
  isListening,
  onToggleVoiceInput,
  onAttachmentSelect,
  onRemoveAttachment,
  onClearAllAttachments,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  prompt: string;
  loading: boolean;
  pendingAttachments: PendingAttachment[];
  attachmentError: string | null;
  selectedModelInfo: (typeof MODELS)[number];
  setSelectedModel: (id: string) => void;
  effort: ThinkingEffort;
  setEffort: (effort: ThinkingEffort) => void;
  isDraggingOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPromptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  isVoiceInputSupported: boolean;
  isListening: boolean;
  onToggleVoiceInput: () => void;
  onAttachmentSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (id: string) => void;
  onClearAllAttachments: () => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  const hasPendingAttachments = pendingAttachments.length > 0;
  const hasErrorAttachments = pendingAttachments.some(a => a.state === "error");
  const isInputDisabled = loading || hasErrorAttachments;
  const thinkingOptions = useMemo(
    () => getThinkingOptions(selectedModelInfo.id),
    [selectedModelInfo.id]
  );
  const selectedEffort = thinkingOptions.find(option => option.value === effort)
    ?? thinkingOptions.find(option => option.value === DEFAULT_THINKING_EFFORT)
    ?? thinkingOptions[0];

  return (
    <div>
      <input
        type="file"
        multiple
        accept={SUPPORTED_FILE_ACCEPT}
        ref={fileInputRef}
        onChange={onAttachmentSelect}
        className="hidden"
      />

      {hasPendingAttachments && (
        <div className="mb-2 ml-1 sm:ml-4 flex items-center gap-3 w-full max-w-[calc(100%-0.5rem)] sm:max-w-[calc(100%-2rem)]">
          <div className="flex-1 min-w-0">
            <AttachmentGroup className="w-full">
              {pendingAttachments.map((att) => {
                const isImg = isImageMimeType(att.mimeType);
                const metaLabel = att.state === "error" && att.errorMessage
                  ? att.errorMessage
                  : getFileMetaLabel(att.fileName, att.file.size);
                const safePreviewUrl = att.state !== "error" ? getSafeAttachmentUrl(att.previewUrl) : undefined;
                return (
                  <Attachment key={att.id} size="sm" className="w-60 max-w-full" state={att.state}>
                    {isImg && att.previewUrl ? (
                      <AttachmentMedia variant="image">
                        <img src={att.previewUrl} alt={att.fileName} />
                      </AttachmentMedia>
                    ) : (
                      <AttachmentMedia>
                        <FileText className="size-4" />
                      </AttachmentMedia>
                    )}
                    <AttachmentContent>
                      <AttachmentTitle>{getFileDisplayName(att.fileName)}</AttachmentTitle>
                      <AttachmentDescription>{metaLabel}</AttachmentDescription>
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction
                        aria-label={`Remove ${att.fileName}`}
                        onClick={() => onRemoveAttachment(att.id)}
                      >
                        <X />
                      </AttachmentAction>
                    </AttachmentActions>
                    {safePreviewUrl && (
                      <AttachmentTrigger asChild>
                        <a
                          href={safePreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${att.fileName}`}
                        />
                      </AttachmentTrigger>
                    )}
                  </Attachment>
                );
              })}
            </AttachmentGroup>
          </div>
          {pendingAttachments.length > 1 && (
            <button
              onClick={onClearAllAttachments}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer shrink-0 pr-4"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {attachmentError && (
        <p className="mb-4 ml-1 sm:ml-4 text-sm text-destructive">{attachmentError}</p>
      )}

      <InputGroup
        className={isDraggingOver ? "ring-ring/50 border-ring ring-[3px]" : undefined}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isDraggingOver && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/90">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Paperclip className="size-4" />
              Drop files to attach
            </div>
          </div>
        )}
        <InputGroupTextarea
          placeholder="Ask anything..."
          className="pl-4 scrollbar-thin"
          value={prompt}
          onChange={onPromptChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          disabled={isInputDisabled}
          maxLength={MAX_INPUT_CHARS}
        />
        <InputGroupAddon align="block-end" className="flex-wrap gap-1.5 sm:gap-2">
          {/* Left: Attach button */}
          <InputGroupButton
            variant="secondary"
            className="shrink-0 rounded-sm"
            size="icon-xs"
            onClick={() => fileInputRef.current?.click()}
            title={pendingAttachments.length >= MAX_ATTACHMENTS
              ? `Maximum of ${MAX_ATTACHMENTS} attachments`
              : "Attach images or files"}
            disabled={isInputDisabled || pendingAttachments.length >= MAX_ATTACHMENTS}
          >
            <Paperclip className="size-4" />
            <span className="sr-only">Attach images or files</span>
          </InputGroupButton>

          {/* Left: Model picker (Restored from previous Chats UI) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton
                variant="secondary"
                className="min-w-0 max-w-full flex-1 justify-start sm:flex-none"
                disabled={isInputDisabled}
                title={`${selectedModelInfo.label} (${selectedEffort.label})`}
                aria-label={`${selectedModelInfo.label} (${selectedEffort.label})`}
              >
                <Image
                  src={selectedModelInfo.icon}
                  alt={selectedModelInfo.label}
                  width={16}
                  height={16}
                  className="mr-1 shrink-0"
                  priority
                />
                <span className="min-w-0 truncate">{selectedModelInfo.label}</span>
                <span className="hidden shrink-0 text-muted-foreground sm:inline">{selectedEffort.label}</span>
                <ChevronDown className="shrink-0" />
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" className="scrollbar-thin">
              <DropdownMenuLabel>Models</DropdownMenuLabel>

              {MODELS.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onSelect={() => setSelectedModel(model.id)}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <Image
                    src={model.icon}
                    alt={model.label}
                    width={16}
                    height={16}
                  />
                  {model.label}
                  <DropdownMenuShortcut>
                    {model.shortcut}
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="hidden cursor-pointer sm:flex">
                  <Gauge />
                  <span>Thinking</span>
                  <span className="ml-auto mr-1 text-xs text-muted-foreground">
                    {selectedEffort.label}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent sideOffset={2} collisionPadding={8} align="end" className="w-50 min-w-0">
                  <DropdownMenuLabel>Thinking</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={effort}
                    onValueChange={(value) => setEffort(value as ThinkingEffort)}
                  >
                    {thinkingOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                        className="cursor-pointer"
                      >
                        <span>{option.label}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <div className="sm:hidden">
                <DropdownMenuLabel>Thinking</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={effort}
                  onValueChange={(value) => setEffort(value as ThinkingEffort)}
                >
                  {thinkingOptions.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="cursor-pointer"
                    >
                      <span>{option.label}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right: Character count */}
          <InputGroupText className="ml-auto">
            {prompt.length > 0 && (
              <span className={`hidden lg:inline ${prompt.length >= MAX_INPUT_CHARS * 0.9 ? 'text-destructive' : prompt.length >= MAX_INPUT_CHARS * 0.75 ? 'text-yellow-500' : ''}`}>
                {prompt.length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()}
              </span>
            )}
          </InputGroupText>
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-5" />

          {/* Right: Microphone button (dictate) */}
          <InputGroupButton
            variant="secondary"
            className={`shrink-0 ${isListening ? "rounded-full text-destructive" : "rounded-full"}`}
            size="icon-xs"
            onClick={onToggleVoiceInput}
            title={!isVoiceInputSupported ? "Voice input is not supported in this browser" : isListening ? "Stop dictation" : "Dictate"}
            aria-label={!isVoiceInputSupported ? "Voice input is not supported in this browser" : isListening ? "Stop dictation" : "Dictate"}
            aria-pressed={isListening}
            disabled={isInputDisabled || !isVoiceInputSupported}
          >
            {isListening ? <MicOff /> : <Mic />}
            <span className="sr-only">{isListening ? "Stop dictation" : "Dictate"}</span>
          </InputGroupButton>

          {/* Far Right: Send button */}
          <InputGroupButton
            variant="default"
            className="shrink-0 rounded-full"
            size="icon-xs"
            onClick={onSend}
            title="Send"
            disabled={isInputDisabled || (!prompt.trim() && !hasPendingAttachments)}
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main SkyeClient Component
// ---------------------------------------------------------------------------

export interface SkyeClientProps {
  user: UserProfile;
  initialThinkingEffort?: ThinkingEffort | null;
}

export function SkyeClient({ user, initialThinkingEffort }: SkyeClientProps) {
  const [chats, setChats] = useState<AiChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showLoadingBar, setShowLoadingBar] = useState(false);

  // Derive active chat title directly
  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId), [chats, activeChatId]);
  const chatTitle = activeChat?.title || "New chat";

  // Model & Thinking configuration
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash-lite');
  const [effort, setEffort] = useState<ThinkingEffort>(initialThinkingEffort ?? DEFAULT_THINKING_EFFORT);

  // Attachments
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Voice dictation
  const [isListening, setIsListening] = useState(false);
  const [isVoiceInputSupported, setIsVoiceInputSupported] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechBasePromptRef = useRef("");
  const promptRef = useRef(prompt);
  const loadingRef = useRef(loading);
  const pendingAttachmentsRef = useRef(pendingAttachments);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const isCreatingNewChatRef = useRef(false);
  const dragCounterRef = useRef(0);

  promptRef.current = prompt;
  loadingRef.current = loading;
  pendingAttachmentsRef.current = pendingAttachments;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loadingMessages) {
      timer = setTimeout(() => setShowLoadingBar(true), 250);
    } else {
      setShowLoadingBar(false);
    }
    return () => clearTimeout(timer);
  }, [loadingMessages]);

  // Load chats on mount
  useEffect(() => {
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    listAiChats()
      .then((loadedChats) => {
        setChats(loadedChats);
      })
      .catch(console.error);
  }, []);

  // Check speech recognition support
  useEffect(() => {
    const speechWindow = window as SpeechRecognitionWindow;
    const isSupported = Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
    setIsVoiceInputSupported(isSupported);
  }, []);


  // Load chat messages when activeChatId changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    if (isCreatingNewChatRef.current) {
      isCreatingNewChatRef.current = false;
      return;
    }

    setLoadingMessages(true);
    getAiMessages(activeChatId)
      .then((msgs) => {
        const displayMsgs: DisplayMessage[] = msgs.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolResults: (m.tool_calls as unknown as AiToolResult[]) || undefined,
          attachments: (m.attachments || []).map((a) => ({
            fileUrl: a.signedFileUrl || a.file_url,
            fileName: a.file_name,
            fileMimeType: a.file_mime_type,
          })),
        }));
        setMessages(displayMsgs);
      })
      .catch((err) => {
        console.error("Failed to load AI messages:", err);
      })
      .finally(() => {
        setLoadingMessages(false);
      });
  }, [activeChatId]);

  // --- Handlers ---

  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
    setPrompt("");
    setPendingAttachments([]);
    setAttachmentError(null);
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
  }, []);

  // Listen for chats cleared event from settings dialog
  useEffect(() => {
    const handleChatsCleared = () => {
      setChats([]);
      handleNewChat();
    };
    window.addEventListener("skyelements:chats-cleared", handleChatsCleared);
    return () => window.removeEventListener("skyelements:chats-cleared", handleChatsCleared);
  }, [handleNewChat]);

  const handleSelectChat = useCallback((chatId: string) => {
    if (chatId === activeChatId) return;
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = 0;
    }
    setActiveChatId(chatId);
  }, [activeChatId]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteAiChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  }, [activeChatId, handleNewChat]);

  const handleTogglePinChat = useCallback(async (chatId: string, currentPinStatus: boolean) => {
    try {
      await togglePinAiChat(chatId, !currentPinStatus);
      setChats((prev) =>
        sortByPinned(
          prev.map((c) => (c.id === chatId ? { ...c, is_pinned: !currentPinStatus } : c))
        )
      );
    } catch (err) {
      console.error("Failed to toggle pin on chat:", err);
    }
  }, []);

  // File and Attachment handling
  const processFiles = useCallback(async (rawFiles: File[]) => {
    setAttachmentError(null);
    const remainingSlots = MAX_ATTACHMENTS - pendingAttachmentsRef.current.length;
    if (remainingSlots <= 0) {
      setAttachmentError(`Maximum of ${MAX_ATTACHMENTS} attachments allowed.`);
      return;
    }

    const filesToProcess = rawFiles.slice(0, remainingSlots);
    if (rawFiles.length > remainingSlots) {
      setAttachmentError(`Only the first ${remainingSlots} files were added (max ${MAX_ATTACHMENTS}).`);
    }

    for (const file of filesToProcess) {
      const isImg = isImageMimeType(file.type);
      const isSupported = isSupportedMimeType(file.type) || isSupportedFileExtension(file.name);

      if (!isSupported) {
        const errorItem: PendingAttachment = {
          id: `err-${Date.now()}-${Math.random()}`,
          file,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          previewUrl: null,
          state: "error",
          errorMessage: "File type not supported.",
        };
        setPendingAttachments((prev) => [...prev, errorItem]);
        continue;
      }

      const maxSize = isImg ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

      if (file.size > maxSize) {
        const errorItem: PendingAttachment = {
          id: `err-${Date.now()}-${Math.random()}`,
          file,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          previewUrl: null,
          state: "error",
          errorMessage: `File exceeds ${formatBytes(maxSize)} limit.`,
        };
        setPendingAttachments((prev) => [...prev, errorItem]);
        continue;
      }

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      let previewUrl: string | null = null;
      let uploadFile = file;

      if (isImg) {
        try {
          const compressed = await compressImage(file);
          uploadFile = new File([compressed.blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
            type: "image/webp",
          });
          previewUrl = compressed.previewUrl;
        } catch {
          previewUrl = URL.createObjectURL(file);
        }
      }

      const newAtt: PendingAttachment = {
        id: tempId,
        file: uploadFile,
        fileName: uploadFile.name,
        mimeType: uploadFile.type,
        previewUrl,
        state: "uploading",
      };

      setPendingAttachments((prev) => [...prev, newAtt]);

      try {
        const supabase = createClient();
        const rawExt = uploadFile.name.includes('.')
          ? uploadFile.name.split('.').pop()!
          : (uploadFile.type.split('/')[1] || 'bin');
        const safeExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'bin';
        const randomToken = Math.random().toString(36).substring(2, 10);
        const storagePath = `${user.id}/${Date.now()}-${randomToken}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-uploads")
          .upload(storagePath, uploadFile, {
            contentType: uploadFile.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setPendingAttachments((prev) =>
          prev.map((att) =>
            att.id === tempId
              ? { ...att, state: "done", uploadedPath: storagePath }
              : att
          )
        );
      } catch (err: any) {
        console.error("Failed to upload attachment:", err);
        setPendingAttachments((prev) =>
          prev.map((att) =>
            att.id === tempId
              ? { ...att, state: "error", errorMessage: "Upload failed. Click to remove." }
              : att
          )
        );
      }
    }
  }, [user.id]);

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.previewUrl) {
        URL.revokeObjectURL(att.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleClearAllAttachments = () => {
    pendingAttachments.forEach((att) => {
      if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
    });
    setPendingAttachments([]);
    setAttachmentError(null);
  };

  // Voice dictation handlers
  const stopVoiceInput = useCallback(() => {
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    setIsListening(false);
  }, []);

  const handleToggleVoiceInput = useCallback(() => {
    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition || loadingRef.current) return;

    if (isListening) {
      stopVoiceInput();
      return;
    }

    const recognition = new SpeechRecognition();
    speechBasePromptRef.current = promptRef.current.trim();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = window.navigator.language || "en-US";

    recognition.onresult = (event) => {
      if (speechRecognitionRef.current !== recognition) return;
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += `${event.results[i][0].transcript} `;
      }
      const nextPrompt = [speechBasePromptRef.current, transcript.trim()]
        .filter(Boolean)
        .join(" ")
        .slice(0, MAX_INPUT_CHARS);
      setPrompt(nextPrompt);
      if (nextPrompt.length >= MAX_INPUT_CHARS) {
        recognition.stop();
      }
    };

    recognition.onend = () => {
      if (speechRecognitionRef.current === recognition) {
        speechRecognitionRef.current = null;
        setIsListening(false);
      }
    };

    recognition.onerror = () => {
      if (speechRecognitionRef.current === recognition) {
        speechRecognitionRef.current = null;
        setIsListening(false);
      }
    };

    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      speechRecognitionRef.current = null;
    }
  }, [isListening, stopVoiceInput]);

  // Drag and drop handlers (Matching previous Chats implementation with counter to prevent flicker)
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (loading) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDraggingOver(true);
  }, [loading]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (loading) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, [loading]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (loading) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  }, [loading]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    if (loading) return;
    if (e.dataTransfer.files) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  }, [loading, processFiles]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (loadingRef.current) return;

    const clipboardImageFiles = Array.from(e.clipboardData.items)
      .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    const imageFiles = clipboardImageFiles.length > 0
      ? clipboardImageFiles
      : Array.from(e.clipboardData.files).filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    e.preventDefault();
    await processFiles(imageFiles);
  }, [processFiles]);

  // Send message
  const handleSend = async () => {
    const textToSend = prompt.trim();
    if (!textToSend && pendingAttachments.length === 0) return;
    if (loading) return;

    stopVoiceInput();

    const readyAttachments = pendingAttachments.filter((a) => a.state === "done");
    if (pendingAttachments.some((a) => a.state === "uploading")) {
      setAttachmentError("Please wait for files to finish uploading.");
      return;
    }

    setPrompt("");
    setPendingAttachments([]);
    setAttachmentError(null);
    setLoading(true);

    try {
      let chatId = activeChatId;
      if (!chatId) {
        isCreatingNewChatRef.current = true;
        const title = textToSend.slice(0, 36) || "New chat";
        const newChat = await createAiChat(title, selectedModel);
        chatId = newChat.id;
        setActiveChatId(chatId);
        setChats((prev) => sortByPinned([newChat, ...prev]));
      }

      // Build attachment refs
      const attachmentRefs: AiAttachmentRef[] = readyAttachments.map((a) => ({
        storagePath: a.uploadedPath!,
        fileName: a.fileName,
        mimeType: a.mimeType,
      }));

      const displayAttachments: DisplayAttachment[] = readyAttachments.map((a) => ({
        fileUrl: a.previewUrl || "",
        fileName: a.fileName,
        fileMimeType: a.mimeType,
      }));

      // Optimistic user message
      const optimisticUserMsg: DisplayMessage = {
        id: `opt-${Date.now()}`,
        role: 'user',
        content: textToSend,
        attachments: displayAttachments,
      };

      setMessages((prev) => [...prev, optimisticUserMsg]);

      // Save user message in DB
      await saveAiMessage(chatId, 'user', textToSend, undefined, attachmentRefs);

      // Build history for backend AI call
      const history: AiChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Generate AI response
      const aiResponse = await generateAiResponse(
        textToSend,
        selectedModel,
        history,
        attachmentRefs,
        effort
      );

      // Save AI message to DB
      await saveAiMessage(
        chatId,
        'assistant',
        aiResponse.text,
        aiResponse.toolResults,
        []
      );

      const assistantDisplayMsg: DisplayMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiResponse.text,
        toolResults: aiResponse.toolResults,
        attachments: [],
      };

      setMessages((prev) => [...prev, assistantDisplayMsg]);
    } catch (err: any) {
      console.error('Error during AI chat execution:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "Sorry, I ran into an error while processing your request. Please try again.",
          attachments: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (loadingRef.current || pendingAttachmentsRef.current.some(a => a.state === "error")) return;
      handleSend();
    }
  };

  const selectedModelInfo = useMemo(
    () => MODELS.find((m) => m.id === selectedModel) || MODELS[0],
    [selectedModel]
  );

  const handleEffortChange = useCallback((nextEffort: ThinkingEffort) => {
    setEffort(nextEffort);
    try {
      window.localStorage.setItem(THINKING_EFFORT_PREFERENCE_KEY, nextEffort);
      document.cookie = `${THINKING_EFFORT_PREFERENCE_KEY}=${nextEffort}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {
      // Ignore
    }
  }, []);

  const inputArea = (
    <InputArea
      prompt={prompt}
      loading={loading}
      pendingAttachments={pendingAttachments}
      attachmentError={attachmentError}
      selectedModelInfo={selectedModelInfo}
      setSelectedModel={setSelectedModel}
      effort={effort}
      setEffort={handleEffortChange}
      isDraggingOver={isDraggingOver}
      fileInputRef={fileInputRef}
      onPromptChange={(e) => setPrompt(e.target.value.slice(0, MAX_INPUT_CHARS))}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onSend={handleSend}
      isVoiceInputSupported={isVoiceInputSupported}
      isListening={isListening}
      onToggleVoiceInput={handleToggleVoiceInput}
      onAttachmentSelect={handleAttachmentSelect}
      onRemoveAttachment={handleRemoveAttachment}
      onClearAllAttachments={handleClearAllAttachments}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    />
  );

  const isEmptyState = messages.length === 0 && !loading && !loadingMessages;

  return (
    <div className="h-full w-full overflow-hidden flex flex-col flex-1 min-h-0 bg-background">
      <SidebarProvider className="h-full w-full overflow-hidden">
        <SkyeSidebar
          chats={chats}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onTogglePinChat={handleTogglePinChat}
        />

        <SidebarInset className="overflow-hidden flex flex-col h-full">
          {/* Header matching previous clean Notes/Chats UI */}
          <header className="flex h-12 shrink-0 items-center gap-2 bg-background">
            <div className="flex h-5 items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    {chatTitle}
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          {/* Main Chat View */}
          <div className="flex-1 overflow-hidden h-[calc(100%-3rem)]">
            {isEmptyState ? (
              /* Empty state matching previous centered Chats UI */
              <div className="h-full overflow-y-auto scrollbar-thin flex items-center justify-center px-5 sm:px-6 md:px-8 py-6 sm:py-8 pb-[10%] scrollbar-gutter-stable">
                <div className="w-full max-w-3xl mx-auto sm:px-4">
                  <div className="flex flex-row gap-4 w-full max-w-3xl mb-4 sm:mb-6">
                    <h1 className="ml-1 sm:ml-4 scroll-m-20 text-2xl sm:text-3xl font-semibold text-balance flex">
                      {greeting}
                    </h1>
                  </div>

                  {inputArea}
                </div>
              </div>
            ) : (
              /* Active Chat View matching previous Chats UI */
              <div className="flex flex-col h-full relative">
                {showLoadingBar && <LoadingBar />}
                <div
                  ref={chatScrollContainerRef}
                  className="flex-1 overflow-y-auto scrollbar-thin px-5 sm:px-6 md:px-8 pt-4 sm:pt-8 md:pt-12 pb-14 sm:pb-20 scrollbar-gutter-stable"
                >
                  <div className="w-full max-w-3xl mx-auto space-y-6 sm:px-4">
                    {loadingMessages ? null : (
                      <>
                        {messages.map((msg, index) => {
                          const nextMsg = messages[index + 1];
                          const nextToolMarkers =
                            msg.role === 'user' &&
                              nextMsg?.role === 'assistant' &&
                              nextMsg.toolResults &&
                              nextMsg.toolResults.length > 0
                              ? getAiToolMarkers(nextMsg.toolResults)
                              : [];

                          return (
                            <div key={msg.id} className="flex flex-col gap-3">
                              <MessageItem msg={msg} />
                              {msg.role === 'user' && msg.attachments.length > 0 && (
                                <Marker>
                                  <MarkerIcon>
                                    <SearchIcon />
                                  </MarkerIcon>
                                  <MarkerContent>
                                    Explored {msg.attachments.length} {msg.attachments.length === 1 ? 'file' : 'files'}
                                  </MarkerContent>
                                </Marker>
                              )}
                              {nextToolMarkers.map((marker, idx) => {
                                const ToolIcon = marker.icon;
                                return (
                                  <Marker key={idx} title={marker.tooltip}>
                                    <MarkerIcon>
                                      <ToolIcon />
                                    </MarkerIcon>
                                    <MarkerContent>{marker.label}</MarkerContent>
                                  </Marker>
                                );
                              })}
                            </div>
                          );
                        })}
                        {loading && (
                          <Marker role="status">
                            <MarkerIcon>
                              <Spinner />
                            </MarkerIcon>
                            <MarkerContent className="shimmer">Thinking...</MarkerContent>
                          </Marker>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0 px-5 sm:px-6 md:px-8 pb-3 sm:pb-6 pt-2 bg-background overflow-y-hidden scrollbar-gutter-stable">
                  <div className="w-full max-w-3xl mx-auto sm:px-4">
                    {inputArea}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
