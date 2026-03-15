'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ArrowUpIcon, ChevronDown, ImagePlus, X } from "lucide-react";
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
import { generateContent, generateContentWithImage, uploadChatImage, createChat, saveMessage, getMessages, updateChatTitle, type ChatMessage, type Message, type ImageAttachment } from "./actions";
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
    const [messages, setMessages] = useState<(ChatMessage & { image_url?: string | null })[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedModel, setSelectedModel] = useState("gemini-3.1-flash-lite-preview");
    const [currentChatId, setCurrentChatId] = useState<string | null>(chatId ?? null);
    const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const generationIdRef = useRef(0);
    const pendingNewChatIdRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedModelInfo = useMemo(
        () => MODELS.find(m => m.id === selectedModel) ?? MODELS[0],
        [selectedModel]
    );
    const isEmptyState = messages.length === 0 && !loading && !loadingHistory;
    const supportsVision = !selectedModel.startsWith('openrouter:');
    const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB

    // Clear pending image when switching to a model that doesn't support vision
    useEffect(() => {
        if (!supportsVision) {
            setPendingImage(null);
            setImageError(null);
        }
    }, [supportsVision]);

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

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            setPendingImage({ base64, mimeType: file.type, previewUrl: dataUrl });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }, []);

    const clearPendingImage = useCallback(() => {
        setPendingImage(null);
        setImageError(null);
    }, []);

    useEffect(() => {
        setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
        setSampleQuery(sampleQueries[Math.floor(Math.random() * sampleQueries.length)]);
    }, []);

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
            getMessages(chatId).then((msgs) => {
                setMessages(msgs.map((m: Message) => ({ role: m.role, content: m.content, image_url: m.image_url })));
                setLoadingHistory(false);
            }).catch(() => {
                setLoadingHistory(false);
            });
        } else {
            setMessages([]);
        }
    }, [chatId]);

    const sendMessage = useCallback(async (userMessage: string) => {
        if (!userMessage.trim() && !pendingImage) return;

        const myGenId = ++generationIdRef.current;
        setLoading(true);
        setPrompt("");
        const imageToSend = pendingImage;
        setPendingImage(null);
        setImageError(null);

        const history = [...messages];
        const displayContent = userMessage;
        setMessages(prev => [...prev, { role: 'user' as const, content: displayContent, image_url: imageToSend?.previewUrl ?? null }]);

        try {
            let activeChatId = currentChatId;
            if (!activeChatId) {
                const newChat = await createChat(selectedModel);
                activeChatId = newChat.id;
                pendingNewChatIdRef.current = activeChatId;
                setCurrentChatId(activeChatId);

                const titleSource = userMessage || 'Image analysis';
                const title = titleSource.length > 50 ? titleSource.slice(0, 50) + '…' : titleSource;
                await updateChatTitle(activeChatId, title);
                onChatCreated?.(activeChatId, title);
            }

            let imagePath: string | undefined;
            if (imageToSend) {
                imagePath = await uploadChatImage(activeChatId, imageToSend.base64, imageToSend.mimeType);
            }

            await saveMessage(activeChatId, 'user', displayContent, imagePath);
            onChatActivity?.(activeChatId);

            let result: string | undefined;
            if (imageToSend) {
                const image: ImageAttachment = { base64: imageToSend.base64, mimeType: imageToSend.mimeType };
                result = await generateContentWithImage(userMessage, selectedModel, history, image);
            } else {
                result = await generateContent(userMessage, selectedModel, history);
            }
            const assistantContent = result ?? "Sorry, I couldn't generate a response.";

            await saveMessage(activeChatId, 'assistant', assistantContent);

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
    }, [currentChatId, messages, selectedModel, pendingImage, onChatCreated, onChatActivity]);

    const handleSend = () => sendMessage(prompt.trim());

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const inputGroup = (
        <div>
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageSelect}
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

            {imageError && (
                <p className="mb-4 ml-4 text-sm text-destructive">{imageError}</p>
            )}

            <InputGroup>
                <InputGroupTextarea
                    placeholder={pendingImage ? "Ask anything about this image..." : "Ask anything..."}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                // autoFocus
                />
                <InputGroupAddon align="block-end">
                    {supportsVision && (
                        <InputGroupButton
                            variant="secondary"
                            className="rounded-sm cursor-pointer"
                            size="icon-xs"
                            onClick={() => fileInputRef.current?.click()}
                            title="Upload an image"
                            disabled={loading}
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
                            <span className="hidden lg:inline">{`${prompt.length} ${prompt.length === 1 ? 'character' : 'characters'}`}</span>
                        )}
                    </InputGroupText>
                    <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
                    <InputGroupButton
                        variant="default"
                        className="rounded-full cursor-pointer"
                        size="icon-xs"
                        onClick={handleSend}
                        title="Send"
                        disabled={loading || (!prompt.trim() && !pendingImage)}
                    >
                        <ArrowUpIcon />
                        <span className="sr-only">Send</span>
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>
    );

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

                    {sampleQuery && !pendingImage && (
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
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-8 pt-12">
                <div className="w-full max-w-3xl mx-auto space-y-6">
                    {loadingHistory ? (
                        <p className="p-4 text-muted-foreground italic flex items-center gap-2">
                            <Spinner /> Loading conversation...
                        </p>
                    ) : (
                        <>
                            {messages.map((msg, i) => (
                                <div key={i} className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-muted' : ''}`}>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                        {msg.role === 'user' ? 'You' : 'Lithium'}
                                    </p>
                                    {msg.image_url && (
                                        <img
                                            src={msg.image_url}
                                            alt="Uploaded image"
                                            className="mb-3 max-h-64 rounded-lg border object-contain"
                                        />
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
