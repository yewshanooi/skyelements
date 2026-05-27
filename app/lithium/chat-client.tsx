'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { generateContent, createChat, saveMessage, getMessages, updateChatTitle, type ChatMessage } from "./chat-actions";
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
    file: File | Blob;
    mimeType: string;
    fileName: string;
    previewUrl: string | null; // only set for images
};

type DisplayMessage = ChatMessage & {
    fileUrl?: string | null;
    fileName?: string | null;
    fileMimeType?: string | null;
};

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

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
    const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
    const [attachmentError, setAttachmentError] = useState<string | null>(null);
    const generationIdRef = useRef(0);
    const pendingNewChatIdRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedModelInfo = useMemo(
        () => MODELS.find(m => m.id === selectedModel) ?? MODELS[0],
        [selectedModel]
    );
    const isEmptyState = messages.length === 0 && !loading && !loadingHistory;
    const supportsAttachments = !selectedModel.startsWith('openrouter:');
    const isOverLimit = prompt.length > MAX_INPUT_CHARS;

    // Clear pending attachment when switching to a model that doesn't support it
    useEffect(() => {
        if (!supportsAttachments) {
            setPendingAttachment((prev) => {
                if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
                return null;
            });
            setAttachmentError(null);
        }
    }, [supportsAttachments]);

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

    const handleAttachmentSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setAttachmentError(null);
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = isImageMimeType(file.type);

        // Validate type
        if (!SUPPORTED_MIME_TYPES.includes(file.type) && !file.type.startsWith('text/')) {
            setAttachmentError('Unsupported file type. Supported: images, PDF, TXT, MD, CSV, HTML, CSS, JS, JSON, XML, Python, Java, C/C++, TypeScript.');
            e.target.value = '';
            return;
        }

        // Validate size (stricter for images)
        const sizeLimit = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
        if (file.size > sizeLimit) {
            setAttachmentError(isImage ? 'Image must be under 4 MB.' : 'File must be under 20 MB.');
            e.target.value = '';
            return;
        }

        // Clean up any previous preview URL
        if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);

        if (isImage) {
            // Compress images larger than 512KB; preview either way
            const useCompression = file.size > 512 * 1024;
            if (useCompression) {
                compressImage(file).then(({ blob, previewUrl }) => {
                    setPendingAttachment({
                        file: blob,
                        mimeType: blob.type || 'image/webp',
                        fileName: file.name,
                        previewUrl,
                    });
                }).catch(() => {
                    const previewUrl = URL.createObjectURL(file);
                    setPendingAttachment({ file, mimeType: file.type, fileName: file.name, previewUrl });
                });
            } else {
                const previewUrl = URL.createObjectURL(file);
                setPendingAttachment({ file, mimeType: file.type, fileName: file.name, previewUrl });
            }
        } else {
            setPendingAttachment({ file, mimeType: file.type, fileName: file.name, previewUrl: null });
        }

        e.target.value = '';
    }, [pendingAttachment]);

    const clearPendingAttachment = useCallback(() => {
        if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
        setPendingAttachment(null);
        setAttachmentError(null);
    }, [pendingAttachment]);

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
                    role: m.role,
                    content: m.content,
                    fileUrl: m.signedFileUrl ?? null,
                    fileName: m.file_name ?? null,
                    fileMimeType: m.file_mime_type ?? null,
                }));

                // Preload images so they don't pop in
                const imageUrls = mapped
                    .filter(m => m.fileMimeType && isImageMimeType(m.fileMimeType) && m.fileUrl)
                    .map(m => m.fileUrl as string);

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

    const sendMessage = useCallback(async (userMessage: string) => {
        if (!userMessage.trim() && !pendingAttachment) return;
        if (userMessage.length > MAX_INPUT_CHARS) return;

        const myGenId = ++generationIdRef.current;
        setLoading(true);
        setPrompt("");
        const attachmentToSend = pendingAttachment;
        setPendingAttachment(null);
        setAttachmentError(null);

        const history = messages.map(({ role, content }) => ({ role, content }));
        const displayContent = attachmentToSend
            ? `${userMessage ? '\n\n' + userMessage : ''}`
            : userMessage;

        // Optimistic preview while uploading
        setMessages(prev => [...prev, {
            role: 'user' as const,
            content: displayContent,
            fileUrl: attachmentToSend?.previewUrl ?? null,
            fileName: attachmentToSend?.fileName ?? null,
            fileMimeType: attachmentToSend?.mimeType ?? null,
        }]);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Run chat creation and file upload in parallel
            let activeChatId = currentChatId;
            const chatCreationPromise = !activeChatId
                ? createChat(selectedModel)
                : Promise.resolve(null);

            let uploadPromise: Promise<string | null> = Promise.resolve(null);
            if (attachmentToSend) {
                const ext = attachmentToSend.fileName.includes('.')
                    ? attachmentToSend.fileName.split('.').pop()!
                    : (attachmentToSend.mimeType.split('/')[1] || 'bin');
                const fileName = `${crypto.randomUUID()}.${ext}`;
                const storagePath = `${user.id}/${fileName}`;

                uploadPromise = supabase.storage
                    .from('chat-images')
                    .upload(storagePath, attachmentToSend.file, {
                        contentType: attachmentToSend.mimeType,
                        upsert: false,
                    })
                    .then(({ error }) => {
                        if (error) throw new Error(`Upload failed: ${error.message}`);
                        return storagePath;
                    });
            }

            const [newChat, fileStoragePath] = await Promise.all([
                chatCreationPromise,
                uploadPromise,
            ]);

            if (newChat) {
                activeChatId = newChat.id;
                pendingNewChatIdRef.current = activeChatId;
                setCurrentChatId(activeChatId);

                const titleSource = userMessage || (attachmentToSend ? attachmentToSend.fileName : 'New chat');
                const title = titleSource.length > 50 ? titleSource.slice(0, 50) + '…' : titleSource;
                await updateChatTitle(activeChatId, title);
                onChatCreated?.(activeChatId, title);
            }

            await saveMessage(
                activeChatId!,
                'user',
                displayContent,
                fileStoragePath,
                attachmentToSend?.mimeType ?? null,
                attachmentToSend?.fileName ?? null,
            );
            onChatActivity?.(activeChatId!);

            const result = await generateContent(
                userMessage,
                selectedModel,
                history,
                fileStoragePath ?? undefined,
                attachmentToSend?.mimeType ?? undefined,
            );
            const assistantContent = result ?? "Sorry, I couldn't generate a response.";

            await saveMessage(activeChatId!, 'assistant', assistantContent);

            if (generationIdRef.current !== myGenId) return;
            setMessages(prev => [...prev, { role: 'assistant' as const, content: assistantContent }]);
        } catch (error) {
            console.error(error);
            if (generationIdRef.current !== myGenId) return;
            setMessages(prev => [...prev, { role: 'assistant' as const, content: "An error occurred while fetching the response." }]);
        } finally {
            if (generationIdRef.current === myGenId) {
                setLoading(false);
            }
        }
    }, [currentChatId, messages, selectedModel, pendingAttachment, onChatCreated, onChatActivity]);

    const handleSend = () => sendMessage(prompt.trim());

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const isPendingImage = pendingAttachment ? isImageMimeType(pendingAttachment.mimeType) : false;

    const inputGroup = useMemo(() => (
        <div>
            <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.pdf,.txt,.md,.csv,.log,.html,.htm,.css,.js,.mjs,.json,.xml,.py,.java,.c,.h,.cpp,.hpp,.cc,.ts,.tsx"
                ref={fileInputRef}
                onChange={handleAttachmentSelect}
                className="hidden"
            />

            {pendingAttachment && (
                <div className="mb-4 ml-4 flex items-start gap-2">
                    {isPendingImage && pendingAttachment.previewUrl ? (
                        <div className="relative group">
                            <img
                                src={pendingAttachment.previewUrl}
                                alt="Upload preview"
                                className="h-20 w-20 rounded-lg object-cover border"
                            />
                            <button
                                onClick={clearPendingAttachment}
                                className="absolute -top-2 -right-2 bg-primary text-secondary rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <X className="size-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative group flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/50">
                            <FileText className="size-5 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate max-w-[200px]">{pendingAttachment.fileName}</span>
                            <button
                                onClick={clearPendingAttachment}
                                className="absolute -top-2 -right-2 bg-primary text-secondary rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <X className="size-3" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {attachmentError && (
                <p className="mb-4 ml-4 text-sm text-destructive">{attachmentError}</p>
            )}

            <InputGroup>
                <InputGroupTextarea
                    placeholder={
                        pendingAttachment
                            ? isPendingImage
                                ? "Ask anything about this image..."
                                : "Ask anything about this file..."
                            : "Ask anything..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, MAX_INPUT_CHARS))}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    maxLength={MAX_INPUT_CHARS}
                />
                <InputGroupAddon align="block-end">
                    {supportsAttachments && (
                        <InputGroupButton
                            variant="secondary"
                            className="rounded-sm cursor-pointer"
                            size="icon-xs"
                            onClick={() => fileInputRef.current?.click()}
                            title="Attach an image or file"
                            disabled={loading}
                        >
                            <Paperclip className="size-4" />
                            <span className="sr-only">Attach a file</span>
                        </InputGroupButton>
                    )}

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
                                        priority
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
                        disabled={loading || isOverLimit || (!prompt.trim() && !pendingAttachment)}
                    >
                        <ArrowUpIcon />
                        <span className="sr-only">Send</span>
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>
    ), [prompt, loading, pendingAttachment, isPendingImage, attachmentError, supportsAttachments, selectedModelInfo, selectedModel, handleKeyDown, handleSend, handleAttachmentSelect, clearPendingAttachment]);

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

                    {sampleQuery && !pendingAttachment && (
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
                            {messages.map((msg, i) => {
                                const isImg = msg.fileMimeType ? isImageMimeType(msg.fileMimeType) : false;
                                return (
                                    <div key={i} className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-muted' : ''}`}>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                            {msg.role === 'user' ? 'You' : 'Lithium'}
                                        </p>
                                        {msg.fileUrl && isImg && (
                                            <div className="mb-3">
                                                <img
                                                    src={msg.fileUrl}
                                                    alt={msg.fileName ?? 'Attached image'}
                                                    className="max-h-64 max-w-full rounded-lg border object-contain"
                                                />
                                            </div>
                                        )}
                                        {msg.fileName && !isImg && (
                                            <div className="mb-3">
                                                {msg.fileUrl ? (
                                                    <a
                                                        href={msg.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/50 hover:bg-muted transition-colors"
                                                    >
                                                        <FileText className="size-4 text-muted-foreground shrink-0" />
                                                        <span className="text-sm">{msg.fileName}</span>
                                                    </a>
                                                ) : (
                                                    <div className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/50">
                                                        <FileText className="size-4 text-muted-foreground shrink-0" />
                                                        <span className="text-sm">{msg.fileName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="prose prose-md dark:prose-invert max-w-none overflow-x-auto">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                );
                            })}
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
