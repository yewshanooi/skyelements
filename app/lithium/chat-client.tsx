'use client';

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { ArrowUpIcon, ChevronDown, Paperclip, FileText, X } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuShortcut,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupTextarea,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner"
import { LoadingBar } from "@/components/ui/loading-bar"
import {
    generateContent,
    createChat,
    saveMessage,
    getMessages,
    updateChatTitle,
    type ChatMessage,
    type AttachmentRef,
} from "./chat-actions";
import { SUPPORTED_MIME_TYPES, isImageMimeType } from "@/lib/file-types";
import { createClient } from "@/utils/supabase/client";
import { MAX_INPUT_CHARS } from "@/lib/chat-context";
import { MODELS } from "@/lib/models";
import Image from 'next/image'


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

const sampleQueries = [
    // What..? questions
    'What is the meaning of life?',
    'What are the latest advancements in AI?',
    'What are some tips for improving mental health?',
    'What is the future of renewable energy?',
    'What are the benefits of meditation?',
    'What are the top trends in technology for the next decade?',
    'What are the best practices for personal productivity?',
    'What are the benefits of space exploration?',
    'What are the key principles of effective leadership?',

    // Can..? questions
    'Can you explain quantum mechanics in simple terms?',
    'Can you explain the theory of relativity?',
    'Can you explain how the internet works?',
    'Can you explain the concept of quantum computing?',

    // How..? questions
    'How does blockchain technology work?',
    'How do black holes work?',
    'How can we combat climate change effectively?',
    'How do vaccines work?',
    'How does the human immune system function?'
];

type PendingAttachment = {
    id: string;
    file: File | Blob;
    mimeType: string;
    fileName: string;
    previewUrl: string | null; // only set for images
};

type DisplayAttachment = {
    fileUrl: string | null;
    fileName: string;
    fileMimeType: string;
};

type DisplayMessage = ChatMessage & {
    id: string;
    attachments: DisplayAttachment[];
};

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_ATTACHMENTS = 5;

const REMARK_PLUGINS = [remarkGfm];

// Memoized so old messages don't re-parse markdown when a new one is appended.
const MessageItem = memo(function MessageItem({ msg }: { msg: DisplayMessage }) {
    return (
        <div className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-muted' : ''}`}>
            <p className="text-xs font-medium text-muted-foreground mb-2">
                {msg.role === 'user' ? 'You' : 'Lithium'}
            </p>
            {msg.attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {msg.attachments.map((att, ai) => {
                        const isImg = isImageMimeType(att.fileMimeType);
                        if (isImg && att.fileUrl) {
                            return (
                                <a
                                    key={ai}
                                    href={att.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={att.fileName ?? 'Attached image'}
                                    className="block h-20 w-20 rounded-lg overflow-hidden border"
                                >
                                    <img
                                        src={att.fileUrl}
                                        alt={att.fileName ?? 'Attached image'}
                                        className="h-full w-full object-cover"
                                    />
                                </a>
                            );
                        }
                        const inner = (
                            <div className="h-full w-full rounded-lg border bg-muted/50 flex flex-col items-center justify-center gap-1 px-2 py-1.5 overflow-hidden">
                                <FileText className="size-6 text-muted-foreground shrink-0" />
                                <span className="text-[10px] leading-tight text-center line-clamp-2 break-all w-full">
                                    {att.fileName}
                                </span>
                            </div>
                        );
                        if (att.fileUrl) {
                            return (
                                <a
                                    key={ai}
                                    href={att.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={att.fileName}
                                    className="block h-20 w-20 hover:opacity-80 transition-opacity"
                                >
                                    {inner}
                                </a>
                            );
                        }
                        return (
                            <div key={ai} title={att.fileName} className="h-20 w-20">
                                {inner}
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="prose prose-md dark:prose-invert max-w-none overflow-x-auto">
                <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>
                    {msg.content}
                </ReactMarkdown>
            </div>
        </div>
    );
});

export function ChatClient({ chatId, onChatCreated, onChatActivity }: {
    chatId?: string | null;
    onChatCreated?: (chatId: string, title: string) => void;
    onChatActivity?: (chatId: string) => void;
}) {
    const [greeting, setGreeting] = useState("");
    const [sampleQuery, setSampleQuery] = useState("");
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showLoadingBar, setShowLoadingBar] = useState(false);
    const [selectedModel, setSelectedModel] = useState("gemini-3.1-flash-lite");
    const [currentChatId, setCurrentChatId] = useState<string | null>(chatId ?? null);
    const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
    const [attachmentError, setAttachmentError] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const generationIdRef = useRef(0);
    const pendingNewChatIdRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef(0);

    const selectedModelInfo = useMemo(
        () => MODELS.find(m => m.id === selectedModel) ?? MODELS[0],
        [selectedModel]
    );
    const isEmptyState = messages.length === 0 && !loading && !loadingHistory;
    const isOverLimit = prompt.length > MAX_INPUT_CHARS;
    const hasPendingAttachments = pendingAttachments.length > 0;

    // Refs that mirror state used inside `sendMessage` so the callback
    // can stay referentially stable across renders.
    const messagesRef = useRef<DisplayMessage[]>(messages);
    const pendingAttachmentsRef = useRef<PendingAttachment[]>(pendingAttachments);
    const currentChatIdRef = useRef<string | null>(currentChatId);
    const selectedModelRef = useRef<string>(selectedModel);
    const onChatCreatedRef = useRef(onChatCreated);
    const onChatActivityRef = useRef(onChatActivity);

    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { pendingAttachmentsRef.current = pendingAttachments; }, [pendingAttachments]);
    useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);
    useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);
    useEffect(() => { onChatCreatedRef.current = onChatCreated; }, [onChatCreated]);
    useEffect(() => { onChatActivityRef.current = onChatActivity; }, [onChatActivity]);

    // Compress an image to a max dimension and convert to WebP
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

    // Validate + process a single file into a PendingAttachment, or return an error.
    const buildPendingAttachment = useCallback(async (file: File): Promise<PendingAttachment | { error: string }> => {
        const isImage = isImageMimeType(file.type);

        if (!SUPPORTED_MIME_TYPES.includes(file.type) && !file.type.startsWith('text/')) {
            return { error: `"${file.name}" has an unsupported file type.` };
        }

        const sizeLimit = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
        if (file.size > sizeLimit) {
            return {
                error: isImage
                    ? `"${file.name}" exceeds the 4 MB image limit.`
                    : `"${file.name}" exceeds the 20 MB file limit.`,
            };
        }

        const id = crypto.randomUUID();

        if (isImage) {
            const useCompression = file.size > 512 * 1024;
            if (useCompression) {
                try {
                    const { blob, previewUrl } = await compressImage(file);
                    return {
                        id,
                        file: blob,
                        mimeType: blob.type || 'image/webp',
                        fileName: file.name,
                        previewUrl,
                    };
                } catch {
                    const previewUrl = URL.createObjectURL(file);
                    return { id, file, mimeType: file.type, fileName: file.name, previewUrl };
                }
            }
            const previewUrl = URL.createObjectURL(file);
            return { id, file, mimeType: file.type, fileName: file.name, previewUrl };
        }

        return { id, file, mimeType: file.type, fileName: file.name, previewUrl: null };
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

        const built = await Promise.all(accepted.map(buildPendingAttachment));
        const newAttachments: PendingAttachment[] = [];
        for (const result of built) {
            if ('error' in result) errors.push(result.error);
            else newAttachments.push(result);
        }

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
        setSampleQuery(sampleQueries[Math.floor(Math.random() * sampleQueries.length)]);
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

    // Load messages when chatId changes (switching chats)
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

                // Preload images so they don't pop in
                const imageUrls = mapped.flatMap(m =>
                    m.attachments
                        .filter(a => isImageMimeType(a.fileMimeType) && a.fileUrl)
                        .map(a => a.fileUrl as string)
                );

                if (imageUrls.length > 0) {
                    await Promise.all(
                        imageUrls.map(url => new Promise<void>((resolve) => {
                            const img = new window.Image();
                            img.onload = () => resolve();
                            img.onerror = () => resolve();
                            img.src = url;
                        }))
                    );
                }

                setMessages(mapped);
                setLoadingHistory(false);
            }).catch(() => {
                setLoadingHistory(false);
            });
        } else {
            setMessages([]);
        }
    }, [chatId]);

    // Revoke any pending blob URLs on unmount to prevent memory leaks.
    useEffect(() => {
        return () => {
            for (const a of pendingAttachmentsRef.current) {
                if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
            }
        };
    }, []);

    const sendMessage = useCallback(async (userMessage: string) => {
        const pendingNow = pendingAttachmentsRef.current;
        if (!userMessage.trim() && pendingNow.length === 0) return;
        if (userMessage.length > MAX_INPUT_CHARS) return;

        const myGenId = ++generationIdRef.current;
        const model = selectedModelRef.current;
        const startingChatId = currentChatIdRef.current;
        const history = messagesRef.current.map(({ role, content }) => ({ role, content }));

        setLoading(true);
        setPrompt("");
        const attachmentsToSend = pendingNow;
        setPendingAttachments([]);
        setAttachmentError(null);

        // Optimistic preview while uploading
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
        }]);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Run chat creation and file uploads in parallel
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

            // Title side-effect runs in parallel with the user-save + generation below.
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

            // Save the user message and start generation in parallel.
            const userSavePromise = saveMessage(activeChatId!, 'user', userMessage, uploadedRefs)
                .catch((e) => { console.error('saveMessage(user) failed:', e); });

            const result = await generateContent(
                userMessage,
                model,
                history,
                uploadedRefs,
            );
            const assistantContent = result ?? "Sorry, I couldn't generate a response.";

            // Persist the assistant message in the background; don't block UI.
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

    const handleSend = useCallback(() => {
        sendMessage(prompt.trim());
    }, [prompt, sendMessage]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(prompt.trim());
        }
    }, [prompt, sendMessage]);

    const inputGroup = useMemo(() => (
        <div>
            <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.pdf,.txt,.md,.csv,.log,.html,.htm,.css,.js,.mjs,.json,.xml,.py,.java,.c,.h,.cpp,.hpp,.cc,.ts,.tsx"
                ref={fileInputRef}
                onChange={handleAttachmentSelect}
                className="hidden"
            />

            {hasPendingAttachments && (
                <div className="mb-4 ml-4 flex flex-wrap items-start gap-2">
                    {pendingAttachments.map((att) => {
                        const isImg = isImageMimeType(att.mimeType);
                        if (isImg && att.previewUrl) {
                            return (
                                <div key={att.id} className="relative group">
                                    <img
                                        src={att.previewUrl}
                                        alt={att.fileName}
                                        className="h-20 w-20 rounded-lg object-cover border"
                                    />
                                    <button
                                        onClick={() => removePendingAttachment(att.id)}
                                        className="absolute -top-2 -right-2 bg-primary text-secondary rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        aria-label={`Remove ${att.fileName}`}
                                    >
                                        <X className="size-3" />
                                    </button>
                                </div>
                            );
                        }
                        return (
                            <div
                                key={att.id}
                                className="relative group h-20 w-20"
                                title={att.fileName}
                            >
                                <div className="h-full w-full rounded-lg border bg-muted/50 flex flex-col items-center justify-center gap-1 px-2 py-1.5 overflow-hidden">
                                    <FileText className="size-6 text-muted-foreground shrink-0" />
                                    <span className="text-[10px] leading-tight text-center line-clamp-2 break-all w-full">
                                        {att.fileName}
                                    </span>
                                </div>
                                <button
                                    onClick={() => removePendingAttachment(att.id)}
                                    className="absolute -top-2 -right-2 bg-primary text-secondary rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    aria-label={`Remove ${att.fileName}`}
                                >
                                    <X className="size-3" />
                                </button>
                            </div>
                        );
                    })}
                    {pendingAttachments.length > 1 && (
                        <button
                            onClick={clearAllPendingAttachments}
                            className="text-xs text-muted-foreground hover:text-foreground self-center cursor-pointer"
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
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, MAX_INPUT_CHARS))}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    maxLength={MAX_INPUT_CHARS}
                />
                <InputGroupAddon align="block-end">
                    <InputGroupButton
                        variant="secondary"
                        className="rounded-sm cursor-pointer"
                        size="icon-xs"
                        onClick={() => fileInputRef.current?.click()}
                        title={pendingAttachments.length >= MAX_ATTACHMENTS
                            ? `Maximum of ${MAX_ATTACHMENTS} attachments`
                            : "Attach images or files"}
                        disabled={loading || pendingAttachments.length >= MAX_ATTACHMENTS}
                    >
                        <Paperclip className="size-4" />
                        <span className="sr-only">Attach files</span>
                    </InputGroupButton>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <InputGroupButton variant="secondary" className="cursor-pointer" disabled={loading}>
                                <Image
                                    src={selectedModelInfo.icon}
                                    alt={selectedModelInfo.label}
                                    width={16}
                                    height={16}
                                    className="mr-1"
                                    priority
                                />
                                {selectedModelInfo.label}
                                <ChevronDown />
                            </InputGroupButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="bottom" align="start">
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
                        </DropdownMenuContent>

                    </DropdownMenu>
                    <InputGroupText className="ml-auto">
                        {prompt.length > 0 && (
                            <span className={`hidden lg:inline ${prompt.length >= MAX_INPUT_CHARS * 0.9 ? 'text-destructive' : prompt.length >= MAX_INPUT_CHARS * 0.75 ? 'text-yellow-500' : ''}`}>
                                {prompt.length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()}
                            </span>
                        )}
                    </InputGroupText>
                    <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
                    <InputGroupButton
                        variant="default"
                        className="rounded-full cursor-pointer"
                        size="icon-xs"
                        onClick={handleSend}
                        title="Send"
                        disabled={loading || isOverLimit || (!prompt.trim() && !hasPendingAttachments)}
                    >
                        <ArrowUpIcon />
                        <span className="sr-only">Send</span>
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>
    ), [prompt, loading, pendingAttachments, hasPendingAttachments, attachmentError, selectedModelInfo, selectedModel, isOverLimit, handleKeyDown, handleSend, handleAttachmentSelect, removePendingAttachment, clearAllPendingAttachments, isDraggingOver, handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

    // New Chat page
    if (isEmptyState) {
        return (
            <div className="h-full overflow-y-auto flex items-center justify-center p-8 pb-[10%]">
                <div className="w-full max-w-3xl mx-auto">
                    <div className="flex flex-row gap-4 w-full max-w-3xl mb-6">
                        <h1 className="ml-4 scroll-m-20 text-3xl font-semibold text-balance flex">
                            {greeting}
                        </h1>
                    </div>

                    {inputGroup}

                    {sampleQuery && !hasPendingAttachments && (
                        <div className="mt-6 flex justify-center px-4">
                            <Button
                                variant="outline"
                                className="cursor-pointer text-sm text-muted-foreground h-auto whitespace-normal text-center max-w-full"
                                onClick={() => sendMessage(sampleQuery)}
                            >
                                &quot;{sampleQuery}&quot;
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Active chat
    return (
        <div className="flex flex-col h-full relative">
            {showLoadingBar && <LoadingBar />}
            <div className="flex-1 overflow-y-auto p-8 pt-12">
                <div className="w-full max-w-3xl mx-auto space-y-6">
                    {loadingHistory ? null : (
                        <>
                            {messages.map((msg) => (
                                <MessageItem key={msg.id} msg={msg} />
                            ))}
                            {loading && (
                                <div className="p-4">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Lithium</p>
                                    <p className="text-muted-foreground italic flex items-center gap-2">
                                        <Spinner /> Thinking...
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="shrink-0 px-8 pb-6 pt-4 bg-background">
                <div className="w-full max-w-3xl mx-auto">
                    {inputGroup}
                </div>
            </div>
        </div>
    );
}
