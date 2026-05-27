'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ArrowUpIcon, ChevronDown, ImagePlus, Paperclip, FileText, X } from "lucide-react";
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
import { generateContent, createChat, saveMessage, getMessages, updateChatTitle, type ChatMessage, type Message } from "./chat-actions";
import { SUPPORTED_MIME_TYPES } from "@/lib/file-types";
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


export function ChatClient({ chatId, onChatCreated, onChatActivity }: {
    chatId?: string | null;
    onChatCreated?: (chatId: string, title: string) => void;
    onChatActivity?: (chatId: string) => void;
}) {
    const [greeting, setGreeting] = useState("");
    const [sampleQuery, setSampleQuery] = useState("");
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState<(ChatMessage & { imageUrl?: string | null; fileUrl?: string | null; fileName?: string | null; fileMimeType?: string | null })[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showLoadingBar, setShowLoadingBar] = useState(false);
    const [selectedModel, setSelectedModel] = useState("gemini-3.1-flash-lite");
    const [currentChatId, setCurrentChatId] = useState<string | null>(chatId ?? null);
    const [pendingImage, setPendingImage] = useState<{ file: Blob; mimeType: string; previewUrl: string } | null>(null);
    const [pendingFile, setPendingFile] = useState<{ file: File | Blob; mimeType: string; fileName: string } | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const generationIdRef = useRef(0);
    const pendingNewChatIdRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const selectedModelInfo = useMemo(
        () => MODELS.find(m => m.id === selectedModel) ?? MODELS[0],
        [selectedModel]
    );
    const isEmptyState = messages.length === 0 && !loading && !loadingHistory;
    const supportsVision = !selectedModel.startsWith('openrouter:');
    const supportsFiles = !selectedModel.startsWith('openrouter:');
    const isOverLimit = prompt.length > MAX_INPUT_CHARS;
    const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

    // Clear pending attachments when switching to a model that doesn't support them
    useEffect(() => {
        if (!supportsVision) {
            setPendingImage(null);
            setImageError(null);
        }
        if (!supportsFiles) {
            setPendingFile(null);
            setFileError(null);
        }
    }, [supportsVision, supportsFiles]);

    const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setImageError(null);
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setImageError('Please select an image file.');
            e.target.value = '';
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            setImageError('Image must be under 4 MB.');
            e.target.value = '';
            return;
        }

        // Use canvas-based compression for images to reduce upload size and AI token usage
        const compressImage = (imgFile: File): Promise<{ blob: Blob; previewUrl: string }> => {
            return new Promise((resolve, reject) => {
                const url = URL.createObjectURL(imgFile);
                const img = new window.Image();
                img.onload = () => {
                    // Limit dimensions to 2048px max (Gemini's optimal input size)
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

                    // Use WebP for better compression, fall back to JPEG
                    const outputType = 'image/webp';
                    const quality = 0.82;
                    canvas.toBlob(
                        (blob) => {
                            URL.revokeObjectURL(url);
                            if (!blob) { reject(new Error('Compression failed')); return; }
                            const previewUrl = URL.createObjectURL(blob);
                            resolve({ blob, previewUrl });
                        },
                        outputType,
                        quality,
                    );
                };
                img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
                img.src = url;
            });
        };

        // Compress if the image is over 512KB, otherwise use raw file
        const shouldCompress = file.size > 512 * 1024;

        if (shouldCompress) {
            compressImage(file).then(({ blob, previewUrl }) => {
                setPendingImage({ file: blob, mimeType: blob.type || 'image/webp', previewUrl });
            }).catch(() => {
                // Fallback: use original file without compression
                const previewUrl = URL.createObjectURL(file);
                setPendingImage({ file, mimeType: file.type, previewUrl });
            });
        } else {
            const previewUrl = URL.createObjectURL(file);
            setPendingImage({ file, mimeType: file.type, previewUrl });
        }

        e.target.value = '';
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError(null);
        const file = e.target.files?.[0];
        if (!file) return;

        if (!SUPPORTED_MIME_TYPES.includes(file.type) && !file.type.startsWith('text/')) {
            setFileError('Unsupported file type. Supported: PDF, TXT, MD, CSV, HTML, CSS, JS, JSON, XML, Python, Java, C/C++, TypeScript.');
            e.target.value = '';
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setFileError('File must be under 20 MB.');
            e.target.value = '';
            return;
        }

        // Don't allow both image and file at the same time
        if (pendingImage) {
            setFileError('Remove the attached image first to attach a file instead.');
            e.target.value = '';
            return;
        }

        // Store the File object directly — no base64 conversion needed until upload
        setPendingFile({ file, mimeType: file.type, fileName: file.name });
        e.target.value = '';
    }, [pendingImage]);

    const clearPendingImage = useCallback(() => {
        if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
        setImageError(null);
    }, [pendingImage]);

    const clearPendingFile = useCallback(() => {
        setPendingFile(null);
        setFileError(null);
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
        // If the parent is just syncing to a chat we created internally via sendMessage,
        // skip invalidation and refetch to avoid disrupting the in-flight generation.
        if (chatId && chatId === pendingNewChatIdRef.current) {
            pendingNewChatIdRef.current = null;
            setCurrentChatId(chatId);
            return;
        }
        pendingNewChatIdRef.current = null;

        // Invalidate any in-flight generation so its UI update is skipped
        generationIdRef.current++;
        setLoading(false);
        setCurrentChatId(chatId ?? null);
        if (chatId) {
            setLoadingHistory(true);
            getMessages(chatId).then(async (msgs) => {
                const mapped = msgs.map((m) => ({
                    role: m.role,
                    content: m.content,
                    imageUrl: m.signedImageUrl ?? null,
                    fileUrl: m.signedFileUrl ?? null,
                    fileName: m.file_name ?? null,
                    fileMimeType: m.file_mime_type ?? null,
                }));

                // Preload all images before showing messages
                const imageUrls = mapped
                    .map(m => m.imageUrl)
                    .filter((url): url is string => !!url);

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
        if (!userMessage.trim() && !pendingImage && !pendingFile) return;
        if (userMessage.length > MAX_INPUT_CHARS) return;

        const myGenId = ++generationIdRef.current;
        setLoading(true);
        setPrompt("");
        const imageToSend = pendingImage;
        const fileToSend = pendingFile;
        setPendingImage(null);
        setPendingFile(null);
        setImageError(null);
        setFileError(null);

        const history = [...messages];
        const displayContent = imageToSend
            ? `${userMessage ? '\n\n' + userMessage : ''}`
            : fileToSend
                ? `${userMessage ? '\n\n' + userMessage : ''}`
                : userMessage;
            
        // Show immediate preview while uploading
        setMessages(prev => [...prev, {
            role: 'user' as const,
            content: displayContent,
            imageUrl: imageToSend?.previewUrl ?? null,
            fileName: fileToSend?.fileName ?? null,
            fileMimeType: fileToSend?.mimeType ?? null,
        }]);

        try {
            // Get authenticated user once for all operations
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Start chat creation in parallel with file upload if needed
            let activeChatId = currentChatId;
            const chatCreationPromise = !activeChatId
                ? createChat(selectedModel)
                : Promise.resolve(null);

            // Upload image/file in parallel with chat creation
            let uploadPromise: Promise<string | null> = Promise.resolve(null);
            let fileUploadPromise: Promise<string | null> = Promise.resolve(null);

            if (imageToSend) {
                const ext = imageToSend.mimeType.split('/')[1]?.replace('webp', 'webp') || 'png';
                const fileName = `${crypto.randomUUID()}.${ext}`;
                const storagePath = `${user.id}/${fileName}`;

                uploadPromise = supabase.storage
                    .from('chat-images')
                    .upload(storagePath, imageToSend.file, {
                        contentType: imageToSend.mimeType,
                        upsert: false,
                    })
                    .then(({ error }) => {
                        if (error) throw new Error(`Image upload failed: ${error.message}`);
                        return storagePath;
                    });
            }

            if (fileToSend) {
                const ext = fileToSend.fileName.split('.').pop() || 'bin';
                const fileName = `${crypto.randomUUID()}.${ext}`;
                const storagePath = `${user.id}/${fileName}`;

                fileUploadPromise = supabase.storage
                    .from('chat-images')
                    .upload(storagePath, fileToSend.file, {
                        contentType: fileToSend.mimeType,
                        upsert: false,
                    })
                    .then(({ error }) => {
                        if (error) throw new Error(`File upload failed: ${error.message}`);
                        return storagePath;
                    });
            }

            // Await all parallel operations
            const [newChat, storagePath, fileStoragePath] = await Promise.all([
                chatCreationPromise,
                uploadPromise,
                fileUploadPromise,
            ]);

            if (newChat) {
                activeChatId = newChat.id;
                pendingNewChatIdRef.current = activeChatId;
                setCurrentChatId(activeChatId);

                const titleSource = userMessage || (imageToSend ? 'Image analysis' : fileToSend ? fileToSend.fileName : 'New chat');
                const title = titleSource.length > 50 ? titleSource.slice(0, 50) + '…' : titleSource;
                await updateChatTitle(activeChatId, title);
                onChatCreated?.(activeChatId, title);
            }

            await saveMessage(
                activeChatId!,
                'user',
                displayContent,
                storagePath,
                fileStoragePath,
                fileToSend?.mimeType ?? null,
                fileToSend?.fileName ?? null,
            );
            onChatActivity?.(activeChatId!);

            let result: string | undefined;
            if (storagePath) {
                result = await generateContent(userMessage, selectedModel, history, storagePath);
            } else if (fileStoragePath && fileToSend) {
                result = await generateContent(userMessage, selectedModel, history, undefined, fileStoragePath, fileToSend.mimeType);
            } else {
                result = await generateContent(userMessage, selectedModel, history);
            }
            const assistantContent = result ?? "Sorry, I couldn't generate a response.";

            await saveMessage(activeChatId!, 'assistant', assistantContent);

            // Only update UI if user hasn't switched to a different chat
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
    }, [currentChatId, messages, selectedModel, pendingImage, pendingFile, onChatCreated, onChatActivity]);

    const handleSend = () => sendMessage(prompt.trim());

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const inputGroup = useMemo(() => (
        <div>
            <input
                type="file"
                accept="image/png, image/jpeg, image/webp, image/heic, image/heif"
                ref={fileInputRef}
                onChange={handleImageSelect}
                className="hidden"
            />
            <input
                type="file"
                accept=".pdf,.txt,.md,.csv,.log,.html,.htm,.css,.js,.mjs,.json,.xml,.py,.java,.c,.h,.cpp,.hpp,.cc,.ts,.tsx"
                ref={docInputRef}
                onChange={handleFileSelect}
                className="hidden"
            />

            {pendingImage && (
                <div className="mb-4 ml-4 flex items-start gap-2">
                    <div className="relative group">
                        <img
                            src={pendingImage.previewUrl}
                            alt="Upload preview"
                            className="h-20 w-20 rounded-lg object-cover border"
                        />
                        <button
                            onClick={clearPendingImage}
                            className="absolute -top-2 -right-2 bg-primary text-secondary rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                            <X className="size-3" />
                        </button>
                    </div>
                </div>
            )}

            {pendingFile && (
                <div className="mb-4 ml-4 flex items-start gap-2">
                    <div className="relative group flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/50">
                        <FileText className="size-5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate max-w-[200px]">{pendingFile.fileName}</span>
                        <button
                            onClick={clearPendingFile}
                            className="absolute -top-2 -right-2 bg-primary text-secondary rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                            <X className="size-3" />
                        </button>
                    </div>
                </div>
            )}

            {imageError && (
                <p className="mb-4 ml-4 text-sm text-destructive">{imageError}</p>
            )}

            {fileError && (
                <p className="mb-4 ml-4 text-sm text-destructive">{fileError}</p>
            )}

            <InputGroup>
                <InputGroupTextarea
                    placeholder={pendingImage ? "Ask anything about this image..." : pendingFile ? `Ask anything about ${pendingFile.fileName}...` : "Ask anything..."}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, MAX_INPUT_CHARS))}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    maxLength={MAX_INPUT_CHARS}
                // autoFocus
                />
                <InputGroupAddon align="block-end">
                    {supportsFiles && (
                        <InputGroupButton
                            variant="secondary"
                            className="rounded-sm cursor-pointer"
                            size="icon-xs"
                            onClick={() => docInputRef.current?.click()}
                            title="Upload a file (PDF, TXT, code)"
                            disabled={loading || !!pendingImage}
                        >
                            <Paperclip className="size-4" />
                            <span className="sr-only">Upload a file</span>
                        </InputGroupButton>
                    )}

                    {supportsVision && (
                        <InputGroupButton
                            variant="secondary"
                            className="rounded-sm cursor-pointer"
                            size="icon-xs"
                            onClick={() => fileInputRef.current?.click()}
                            title="Upload an image"
                            disabled={loading || !!pendingFile}
                        >
                            <ImagePlus className="size-4" />
                            <span className="sr-only">Upload an image</span>
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
                        disabled={loading || isOverLimit || (!prompt.trim() && !pendingImage && !pendingFile)}
                    >
                        <ArrowUpIcon />
                        <span className="sr-only">Send</span>
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>
    ), [prompt, loading, pendingImage, pendingFile, imageError, fileError, supportsVision, supportsFiles, selectedModelInfo, selectedModel, handleKeyDown, handleSend, handleImageSelect, handleFileSelect, clearPendingImage, clearPendingFile]);

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

                    {sampleQuery && !pendingImage && !pendingFile && (
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
                            {messages.map((msg, i) => (
                                <div key={i} className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-muted' : ''}`}>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                        {msg.role === 'user' ? 'You' : 'Lithium'}
                                    </p>
                                    {msg.imageUrl && (
                                        <div className="mb-3">
                                            <img
                                                src={msg.imageUrl}
                                                alt="Attached image"
                                                className="max-h-64 max-w-full rounded-lg border object-contain"
                                            />
                                        </div>
                                    )}
                                    {msg.fileName && (
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
