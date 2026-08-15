'use client';

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { ArrowUpIcon, Gauge, CheckIcon, ChevronDown, CopyIcon, Paperclip, FileText, X, SearchIcon, FileWarning, Mic, MicOff } from "lucide-react";
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
import {
    Collapsible,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner"
import { LoadingBar } from "@/components/ui/loading-bar"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
    generateContent,
    createChat,
    saveMessage,
    getMessages,
    updateChatTitle,
    type ChatMessage,
    type AttachmentRef,
} from "./chat-actions";
import { SUPPORTED_MIME_TYPES, isImageMimeType, MAX_INPUT_CHARS } from "@/lib/chat-context";
import { createClient } from "@/utils/supabase/client";
import {
    getThinkingOptions,
    MODELS,
    THINKING_EFFORT_PREFERENCE_KEY,
    type ThinkingEffort,
} from "@/lib/models";
import Image from 'next/image';
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

type SpeechRecognitionResultLike = {
    isFinal: boolean;
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
    abort: () => void;
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

const getFileMetaLabel = (fileName: string, mimeType: string, size?: number) => {
    const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
    const sizeStr = size !== undefined ? formatBytes(size) : '';
    return sizeStr ? `${ext} · ${sizeStr}` : ext;
};

// Hoisted outside component — pure function, no state deps.
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
            if (!ctx) { reject(new Error('Canvas not supported')); return; }
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    canvas.width = 0;
                    canvas.height = 0;
                    URL.revokeObjectURL(url);
                    if (!blob) { reject(new Error('Compression failed')); return; }
                    const previewUrl = URL.createObjectURL(blob);
                    resolve({ blob, previewUrl });
                },
                'image/webp',
                0.82,
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
        img.src = url;
    });
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

type PendingAttachment = {
    id: string;
    file: File | Blob;
    mimeType: string;
    fileName: string;
    previewUrl: string | null;
    state?: "idle" | "uploading" | "processing" | "error" | "done";
    errorMessage?: string;
};

type DisplayAttachment = {
    fileUrl: string | null;
    fileName: string;
    fileMimeType: string;
};

type DisplayMessage = ChatMessage & {
    id: string;
    attachments: DisplayAttachment[];
    isOptimistic?: boolean;
    hasUploadError?: boolean;
};

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_ATTACHMENTS = 5;

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];
const PREVIEW_LENGTH = 200;

function useLatestRef<T>(value: T) {
    const ref = useRef(value);
    useEffect(() => { ref.current = value; }, [value]);
    return ref;
}



// Memoized to avoid re-parsing markdown on sibling updates.
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
        } catch (error) {
            console.error(`Failed to copy ${isUser ? 'prompt' : 'response'}:`, error);
        }
    };


    return (
        <div className="flex flex-col">
            <p className={`text-xs font-medium text-muted-foreground mb-1.5 ${isUser ? 'self-end' : ''}`}>
                {isUser ? 'You' : 'Lithium'}
            </p>
            {msg.attachments.length > 0 && (
                <div className={`mb-2 max-w-full w-fit ${isUser ? 'self-end' : 'self-start'}`}>
                    <AttachmentGroup>
                        {msg.attachments.map((att, ai) => {
                            const isImg = isImageMimeType(att.fileMimeType);
                            const metaLabel = msg.hasUploadError
                                ? "Upload failed"
                                : msg.isOptimistic
                                    ? "Uploading..."
                                    : getFileMetaLabel(att.fileName, att.fileMimeType);
                            const attState = msg.hasUploadError
                                ? "error"
                                : msg.isOptimistic
                                    ? "uploading"
                                    : "done";
                            return (
                                <Attachment key={ai} size="sm" className="w-60 max-w-full" state={attState}>
                                    {attState === "error" ? (
                                        <AttachmentMedia>
                                            <FileWarning className="size-4 text-destructive" />
                                        </AttachmentMedia>
                                    ) : attState === "uploading" ? (
                                        <AttachmentMedia>
                                            <Spinner className="size-4" />
                                        </AttachmentMedia>
                                    ) : isImg && att.fileUrl ? (
                                        <AttachmentMedia variant="image">
                                            <img src={att.fileUrl} alt={att.fileName} />
                                        </AttachmentMedia>
                                    ) : (
                                        <AttachmentMedia>
                                            <FileText className="size-4" />
                                        </AttachmentMedia>
                                    )}
                                    <AttachmentContent>
                                        <AttachmentTitle>{att.fileName}</AttachmentTitle>
                                        <AttachmentDescription>{metaLabel}</AttachmentDescription>
                                    </AttachmentContent>
                                    {attState === "done" && att.fileUrl && (
                                        <AttachmentTrigger asChild>
                                            <a
                                                href={att.fileUrl}
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
            {msg.content.trim().length > 0 && (
                <Bubble
                    variant={isUser ? 'tinted' : 'ghost'}
                    align={isUser ? 'end' : 'start'}
                    className="pb-3"
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

// Memo'd input area component.
const InputArea = memo(function InputArea({
    prompt,
    loading,
    pendingAttachments,
    attachmentError,
    selectedModelInfo,
    setSelectedModel,
    effort,
    setEffort,
    isOverLimit,
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
    isOverLimit: boolean;
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
    const selectedEffort = thinkingOptions.find(option => option.value === effort) ?? thinkingOptions[0];

    return (
        <div>
            <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.pdf,.txt,.md,.csv,.log,.html,.htm,.css,.js,.mjs,.json,.xml,.py,.java,.c,.h,.cpp,.hpp,.cc,.ts,.tsx"
                ref={fileInputRef}
                onChange={onAttachmentSelect}
                className="hidden"
            />

            {hasPendingAttachments && (
                <div className="mb-2 ml-4 flex items-center gap-3 w-full max-w-[calc(100%-2rem)]">
                    <div className="flex-1 min-w-0">
                        <AttachmentGroup className="w-full">
                            {pendingAttachments.map((att) => {
                                const isImg = isImageMimeType(att.mimeType);
                                const metaLabel = att.state === "error" && att.errorMessage
                                    ? att.errorMessage
                                    : getFileMetaLabel(att.fileName, att.mimeType, att.file.size);
                                return (
                                    <Attachment key={att.id} size="sm" className="w-60 max-w-full" state={att.state}>
                                        {att.state === "error" ? (
                                            <AttachmentMedia>
                                                <FileWarning className="size-4 text-destructive" />
                                            </AttachmentMedia>
                                        ) : isImg && att.previewUrl ? (
                                            <AttachmentMedia variant="image">
                                                <img src={att.previewUrl} alt={att.fileName} />
                                            </AttachmentMedia>
                                        ) : (
                                            <AttachmentMedia>
                                                <FileText className="size-4" />
                                            </AttachmentMedia>
                                        )}
                                        <AttachmentContent>
                                            <AttachmentTitle>{att.fileName}</AttachmentTitle>
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
                                        {att.state !== "error" && att.previewUrl && (
                                            <AttachmentTrigger asChild>
                                                <a
                                                    href={att.previewUrl}
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
                <p className="mb-4 ml-4 text-sm text-destructive">{attachmentError}</p>
            )}

            <InputGroup
                className={isDraggingOver ? "ring-ring/50 border-ring ring-[3px]" : undefined}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                {isDraggingOver && (
                    <div
                        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/90"
                    >
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

                    <InputGroupText className="ml-auto">
                        {prompt.length > 0 && (
                            <span className={`hidden lg:inline ${prompt.length >= MAX_INPUT_CHARS * 0.9 ? 'text-destructive' : prompt.length >= MAX_INPUT_CHARS * 0.75 ? 'text-yellow-500' : ''}`}>
                                {prompt.length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()}
                            </span>
                        )}
                    </InputGroupText>
                    <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-5" />
                    <InputGroupButton
                        variant="secondary"
                        className={`shrink-0 ${isListening ? "rounded-full text-destructive" : "rounded-full"}`}
                        size="icon-xs"
                        onClick={onToggleVoiceInput}
                        title={!isVoiceInputSupported ? "Voice input is not supported in this browser" : isListening ? "Stop dictating" : "Dictate"}
                        aria-label={!isVoiceInputSupported ? "Voice input is not supported in this browser" : isListening ? "Stop dictating" : "Dictate"}
                        aria-pressed={isListening}
                        disabled={isInputDisabled || !isVoiceInputSupported}
                    >
                        {isListening ? <MicOff /> : <Mic />}
                        <span className="sr-only">{isListening ? "Stop dictating" : "Dictate"}</span>
                    </InputGroupButton>
                    <InputGroupButton
                        variant="default"
                        className="shrink-0 rounded-full"
                        size="icon-xs"
                        onClick={onSend}
                        title="Send"
                        disabled={isInputDisabled || isOverLimit || (!prompt.trim() && !hasPendingAttachments)}
                    >
                        <ArrowUpIcon />
                        <span className="sr-only">Send</span>
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>
    );
});

export function ChatClient({
    chatId,
    onChatCreated,
    onChatActivity,
    thinkingEffort,
    onThinkingEffortChange,
}: {
    chatId?: string | null;
    onChatCreated?: (chatId: string, title: string) => void;
    onChatActivity?: (chatId: string) => void;
    thinkingEffort: ThinkingEffort;
    onThinkingEffortChange?: (effort: ThinkingEffort) => void;
}) {
    const [greeting, setGreeting] = useState("");
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showLoadingBar, setShowLoadingBar] = useState(false);
    const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash-lite");
    const [effort, setEffort] = useState<ThinkingEffort>(thinkingEffort);
    const [currentChatId, setCurrentChatId] = useState<string | null>(chatId ?? null);
    const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
    const [attachmentError, setAttachmentError] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isVoiceInputSupported, setIsVoiceInputSupported] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const generationIdRef = useRef(0);
    const pendingNewChatIdRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef(0);
    const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
    const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const speechBasePromptRef = useRef("");

    const selectedModelInfo = useMemo(
        () => MODELS.find(m => m.id === selectedModel) ?? MODELS[0],
        [selectedModel]
    );
    const isEmptyState = messages.length === 0 && !loading && !loadingHistory;
    const isOverLimit = prompt.length > MAX_INPUT_CHARS;

    // Refs for stable `sendMessage` callback.
    const messagesRef = useLatestRef(messages);
    const pendingAttachmentsRef = useLatestRef(pendingAttachments);
    const currentChatIdRef = useLatestRef(currentChatId);
    const selectedModelRef = useLatestRef(selectedModel);
    const effortRef = useLatestRef(effort);
    const promptRef = useLatestRef(prompt);
    const loadingRef = useLatestRef(loading);
    const onChatCreatedRef = useLatestRef(onChatCreated);
    const onChatActivityRef = useLatestRef(onChatActivity);
    const onThinkingEffortChangeRef = useLatestRef(onThinkingEffortChange);

    useEffect(() => {
        const speechWindow = window as SpeechRecognitionWindow;
        setIsVoiceInputSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));

        return () => {
            speechRecognitionRef.current?.abort();
            speechRecognitionRef.current = null;
        };
    }, []);

    useEffect(() => {
        speechRecognitionRef.current?.abort();
        speechRecognitionRef.current = null;
        setIsListening(false);
    }, [chatId]);



    // Validate + process a file into a PendingAttachment.
    const buildPendingAttachment = useCallback(async (file: File): Promise<PendingAttachment> => {
        const isImage = isImageMimeType(file.type);
        const id = crypto.randomUUID();

        if (!SUPPORTED_MIME_TYPES.includes(file.type) && !file.type.startsWith('text/')) {
            return {
                id,
                file,
                mimeType: file.type,
                fileName: file.name,
                previewUrl: null,
                state: "error",
                errorMessage: "Unsupported file type",
            };
        }

        const sizeLimit = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
        if (file.size > sizeLimit) {
            return {
                id,
                file,
                mimeType: file.type,
                fileName: file.name,
                previewUrl: null,
                state: "error",
                errorMessage: isImage ? "Exceeds 4 MB limit" : "Exceeds 20 MB limit",
            };
        }

        if (isImage && file.size > 512 * 1024) {
            try {
                const { blob, previewUrl } = await compressImage(file);
                return {
                    id,
                    file: blob,
                    mimeType: blob.type || 'image/webp',
                    fileName: file.name,
                    previewUrl,
                    state: "done",
                };
            } catch {
                // Fall through to default return
            }
        }

        const previewUrl = URL.createObjectURL(file);
        return { id, file, mimeType: file.type, fileName: file.name, previewUrl, state: "done" };
    }, []);

    const addFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        setAttachmentError(null);

        const remainingSlots = MAX_ATTACHMENTS - pendingAttachmentsRef.current.length;
        const overflow = files.length > remainingSlots;
        const accepted = files.slice(0, Math.max(0, remainingSlots));

        const errors: string[] = [];
        if (overflow) {
            errors.push(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
        }

        const newAttachments = await Promise.all(accepted.map(buildPendingAttachment));

        if (newAttachments.length > 0) {
            setPendingAttachments(prev => [...prev, ...newAttachments]);
        }
        if (errors.length > 0) {
            setAttachmentError(errors.join(' '));
        }
    }, [buildPendingAttachment]);

    const handleAttachmentSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        await addFiles(files);
    }, [addFiles]);

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
        const files = Array.from(e.dataTransfer.files ?? []);
        await addFiles(files);
    }, [addFiles, loading]);

    const removePendingAttachment = useCallback((id: string) => {
        setPendingAttachments(prev => {
            const target = prev.find(a => a.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter(a => a.id !== id);
        });
        setAttachmentError(null);
    }, []);

    const clearAllPendingAttachments = useCallback(() => {
        setPendingAttachments(prev => {
            for (const a of prev) {
                if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
            }
            return [];
        });
        setAttachmentError(null);
    }, []);

    useEffect(() => {
        setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    }, []);

    const handleEffortChange = useCallback((nextEffort: ThinkingEffort) => {
        setEffort(nextEffort);
        onThinkingEffortChangeRef.current?.(nextEffort);

        try {
            window.localStorage.setItem(THINKING_EFFORT_PREFERENCE_KEY, nextEffort);
            document.cookie = `${THINKING_EFFORT_PREFERENCE_KEY}=${nextEffort}; Path=/; Max-Age=31536000; SameSite=Lax`;
        } catch {
            // Ignore unavailable browser storage; the current selection still works.
        }
    }, []);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (loadingHistory) {
            timer = setTimeout(() => setShowLoadingBar(true), 250);
        } else {
            setShowLoadingBar(false);
        }
        return () => clearTimeout(timer);
    }, [loadingHistory]);

    // Load messages on chat switch.
    useEffect(() => {
        if (chatId && chatId === pendingNewChatIdRef.current) {
            pendingNewChatIdRef.current = null;
            setCurrentChatId(chatId);
            return;
        }
        pendingNewChatIdRef.current = null;

        generationIdRef.current++;
        setLoading(false);
        setCurrentChatId(chatId ?? null);
        if (chatId) {
            setLoadingHistory(true);
            getMessages(chatId).then(async (msgs) => {
                const mapped: DisplayMessage[] = msgs.map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    attachments: m.attachments.map(a => ({
                        fileUrl: a.signedFileUrl ?? null,
                        fileName: a.file_name,
                        fileMimeType: a.file_mime_type,
                    })),
                }));

                setMessages(mapped);
                setLoadingHistory(false);

                // Preload images in background (non-blocking).
                const imageUrls = mapped.flatMap(m =>
                    m.attachments
                        .filter(a => isImageMimeType(a.fileMimeType) && a.fileUrl)
                        .map(a => a.fileUrl as string)
                );
                for (const url of imageUrls) {
                    const img = new window.Image();
                    img.src = url;
                }
            }).catch(() => {
                setLoadingHistory(false);
            });
        } else {
            setMessages([]);
        }
    }, [chatId]);

    // Revoke blob URLs on unmount.
    useEffect(() => {
        return () => {
            for (const a of pendingAttachmentsRef.current) {
                if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
            }
        };
    }, []);

    const sendMessage = useCallback(async (userMessage: string) => {
        const pendingNow = pendingAttachmentsRef.current;
        if (pendingNow.some(a => a.state === "error")) return;
        if (!userMessage.trim() && pendingNow.length === 0) return;
        if (userMessage.length > MAX_INPUT_CHARS) return;

        const myGenId = ++generationIdRef.current;
        const model = selectedModelRef.current;
        const selectedEffort = effortRef.current;
        const startingChatId = currentChatIdRef.current;
        const history = messagesRef.current.map(({ role, content }) => ({ role, content }));

        setLoading(true);
        setPrompt("");
        const attachmentsToSend = pendingNow;
        setPendingAttachments([]);
        setAttachmentError(null);

        // Optimistic UI.
        const optimisticId = crypto.randomUUID();
        setMessages(prev => [...prev, {
            id: optimisticId,
            role: 'user' as const,
            content: userMessage,
            attachments: attachmentsToSend.map(a => ({
                fileUrl: a.previewUrl,
                fileName: a.fileName,
                fileMimeType: a.mimeType,
            })),
            isOptimistic: true,
        }]);

        try {
            if (!supabaseRef.current) supabaseRef.current = createClient();
            const supabase = supabaseRef.current;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Chat creation + uploads in parallel.
            let activeChatId = startingChatId;
            const chatCreationPromise = !activeChatId
                ? createChat(model)
                : Promise.resolve(null);

            const uploadPromises: Promise<AttachmentRef>[] = attachmentsToSend.map(async (att) => {
                const ext = att.fileName.includes('.')
                    ? att.fileName.split('.').pop()!
                    : (att.mimeType.split('/')[1] || 'bin');
                const storedName = `${crypto.randomUUID()}.${ext}`;
                const storagePath = `${user.id}/${storedName}`;

                const { error } = await supabase.storage
                    .from('chat-uploads')
                    .upload(storagePath, att.file, {
                        contentType: att.mimeType,
                        upsert: false,
                    });
                if (error) throw new Error(`Upload failed: ${error.message}`);

                return { storagePath, mimeType: att.mimeType, fileName: att.fileName };
            });

            const [newChat, uploadedRefs] = await Promise.all([
                chatCreationPromise,
                Promise.all(uploadPromises),
            ]);

            // Title update (non-blocking).
            let titlePromise: Promise<unknown> = Promise.resolve();
            if (newChat) {
                activeChatId = newChat.id;
                pendingNewChatIdRef.current = activeChatId;
                setCurrentChatId(activeChatId);

                const titleSource = userMessage
                    || (attachmentsToSend.length === 1
                        ? attachmentsToSend[0].fileName
                        : attachmentsToSend.length > 1
                            ? `${attachmentsToSend.length} files`
                            : 'New chat');
                const title = titleSource.length > 50 ? titleSource.slice(0, 50) + '…' : titleSource;
                titlePromise = updateChatTitle(activeChatId, title).catch((e) => {
                    console.error('updateChatTitle failed:', e);
                });
                onChatCreatedRef.current?.(activeChatId, title);
            }

            onChatActivityRef.current?.(activeChatId!);

            // Save user message + generate in parallel.
            const userSavePromise = saveMessage(activeChatId!, 'user', userMessage, uploadedRefs)
                .then((savedMsg) => {
                    setMessages(prev => prev.map(m => m.id === optimisticId ? {
                        ...m,
                        isOptimistic: false,
                    } : m));
                    return savedMsg;
                })
                .catch((e) => {
                    console.error('saveMessage(user) failed:', e);
                    setMessages(prev => prev.map(m => m.id === optimisticId ? {
                        ...m,
                        isOptimistic: false,
                        hasUploadError: true,
                    } : m));
                    throw e;
                });

            const result = await generateContent(
                userMessage,
                model,
                history,
                uploadedRefs,
                selectedEffort,
            );
            const assistantContent = result ?? "Sorry, I couldn't generate a response.";

            // Persist assistant message in background.
            Promise.all([userSavePromise, titlePromise])
                .then(() => saveMessage(activeChatId!, 'assistant', assistantContent))
                .catch((e) => { console.error('saveMessage(assistant) failed:', e); });

            if (generationIdRef.current !== myGenId) return;
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant' as const,
                content: assistantContent,
                attachments: [],
            }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => prev.map(m => m.id === optimisticId ? {
                ...m,
                isOptimistic: false,
                hasUploadError: true,
            } : m));

            if (generationIdRef.current !== myGenId) return;
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant' as const,
                content: "An error occurred while fetching the response.",
                attachments: [],
            }]);
        } finally {
            if (generationIdRef.current === myGenId) {
                setLoading(false);
            }
        }
    }, []);

    // Read prompt from ref to keep callbacks stable across keystrokes.
    const stopVoiceInput = useCallback(() => {
        const recognition = speechRecognitionRef.current;
        if (!recognition) return;

        recognition.abort();
        speechRecognitionRef.current = null;
        setIsListening(false);
    }, []);

    const handleSend = useCallback(() => {
        stopVoiceInput();
        sendMessage(promptRef.current.trim());
    }, [sendMessage, stopVoiceInput]);

    const handleToggleVoiceInput = useCallback(() => {
        const speechWindow = window as SpeechRecognitionWindow;
        const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

        if (!SpeechRecognition || loadingRef.current) return;

        if (isListening) {
            speechRecognitionRef.current?.stop();
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
            for (let index = 0; index < event.results.length; index += 1) {
                transcript += `${event.results[index][0].transcript} `;
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
            // Browser speech services can intermittently report errors such as
            // "network" or "no-speech". Stop listening without surfacing a
            // console error, which would trigger Next.js's development overlay.
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
    }, [isListening]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (loadingRef.current || pendingAttachmentsRef.current.some(a => a.state === "error")) return;
            stopVoiceInput();
            sendMessage(promptRef.current.trim());
        }
    }, [sendMessage, stopVoiceInput]);

    const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (loadingRef.current) return;

        const clipboardImageFiles = Array.from(e.clipboardData.items)
            .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
            .map(item => item.getAsFile())
            .filter((file): file is File => file !== null);

        // Some browsers expose clipboard images through `files` instead of `items`.
        const imageFiles = clipboardImageFiles.length > 0
            ? clipboardImageFiles
            : Array.from(e.clipboardData.files).filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) return;

        e.preventDefault();
        const pastedAt = Date.now();
        const files = imageFiles.map((file, index) => {
            const mimeType = file.type || 'image/png';
            const extension = mimeType === 'image/jpeg'
                ? 'jpg'
                : mimeType.split('/')[1]?.split('+')[0] || 'png';
            const fileName = file.name && file.name !== 'blob'
                ? file.name
                : `pasted-image-${pastedAt}${imageFiles.length > 1 ? `-${index + 1}` : ''}.${extension}`;

            return file.name === fileName
                ? file
                : new File([file], fileName, { type: mimeType });
        });

        await addFiles(files);
    }, [addFiles]);

    const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPrompt(e.target.value.slice(0, MAX_INPUT_CHARS));
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
            isOverLimit={isOverLimit}
            isDraggingOver={isDraggingOver}
            fileInputRef={fileInputRef}
            onPromptChange={handlePromptChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onSend={handleSend}
            isVoiceInputSupported={isVoiceInputSupported}
            isListening={isListening}
            onToggleVoiceInput={handleToggleVoiceInput}
            onAttachmentSelect={handleAttachmentSelect}
            onRemoveAttachment={removePendingAttachment}
            onClearAllAttachments={clearAllPendingAttachments}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        />
    );

    // Empty state.
    if (isEmptyState) {
        return (
            <div className="h-full overflow-y-auto scrollbar-thin flex items-center justify-center p-8 pb-[10%] scrollbar-gutter-stable">
                <div className="w-full max-w-3xl mx-auto">
                    <div className="flex flex-row gap-4 w-full max-w-3xl mb-6">
                        <h1 className="ml-4 scroll-m-20 text-3xl font-semibold text-balance flex">
                            {greeting}
                        </h1>
                    </div>

                    {inputArea}
                </div>
            </div>
        );
    }

    // Active chat.
    return (
        <div className="flex flex-col h-full relative">
            {showLoadingBar && <LoadingBar />}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-8 pt-12 pb-20 scrollbar-gutter-stable">
                <div className="w-full max-w-3xl mx-auto space-y-6 px-4">
                    {loadingHistory ? null : (
                        <>
                            {messages.map((msg) => (
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
                                </div>
                            ))}
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

            <div className="shrink-0 px-8 pb-6 pt-2 bg-background overflow-y-hidden scrollbar-gutter-stable">
                <div className="w-full max-w-3xl mx-auto">
                    {inputArea}
                </div>
            </div>
        </div>
    );
}
