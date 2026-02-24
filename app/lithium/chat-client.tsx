'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowUpIcon, ChevronDown } from "lucide-react";
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
import { generateContent, createChat, saveMessage, getMessages, updateChatTitle, type ChatMessage, type Message } from "./actions";
import { MODELS } from "@/lib/models";
import Image from 'next/image'


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
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedModel, setSelectedModel] = useState("openrouter:arcee-ai/trinity-large-preview:free");
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId ?? null);

  const selectedModelInfo = useMemo(
    () => MODELS.find(m => m.id === selectedModel) ?? MODELS[0],
    [selectedModel]
  );
  const isEmptyState = messages.length === 0 && !loading && !loadingHistory;

  useEffect(() => {
    setWelcomeMessage(sampleQueries[Math.floor(Math.random() * sampleQueries.length)]);
  }, []);

  // Load messages when chatId changes (switching chats)
  useEffect(() => {
    setCurrentChatId(chatId ?? null);
    if (chatId) {
      setLoadingHistory(true);
      getMessages(chatId).then((msgs) => {
        setMessages(msgs.map((m: Message) => ({ role: m.role, content: m.content })));
        setLoadingHistory(false);
      }).catch(() => {
        setLoadingHistory(false);
      });
    } else {
      setMessages([]);
    }
  }, [chatId]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    setLoading(true);
    setPrompt("");

    const history = [...messages];
    setMessages(prev => [...prev, { role: 'user' as const, content: userMessage }]);

    try {
      let activeChatId = currentChatId;
      if (!activeChatId) {
        const newChat = await createChat(selectedModel);
        activeChatId = newChat.id;
        setCurrentChatId(activeChatId);

        const title = userMessage.length > 50 ? userMessage.slice(0, 50) + '…' : userMessage;
        await updateChatTitle(activeChatId, title);
        onChatCreated?.(activeChatId, title);
      }

      await saveMessage(activeChatId, 'user', userMessage);
      onChatActivity?.(activeChatId);

      const result = await generateContent(userMessage, selectedModel, history);
      const assistantContent = result ?? "Sorry, I couldn't generate a response.";

      await saveMessage(activeChatId, 'assistant', assistantContent);

      setMessages(prev => [...prev, { role: 'assistant' as const, content: assistantContent }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant' as const, content: "An error occurred while fetching the response." }]);
    } finally {
      setLoading(false);
    }
  }, [currentChatId, messages, selectedModel, onChatCreated, onChatActivity]);

  const handleSend = () => sendMessage(prompt.trim());

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const inputGroup = (
    <InputGroup>
        <InputGroupTextarea 
          placeholder="Ask anything..." 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          // autoFocus
        />
        <InputGroupAddon align="block-end">
          {/* <InputGroupButton
            variant="outline"
            className="rounded-full"
            size="icon-xs"
          >
            <Plus />
          </InputGroupButton> */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton variant="secondary" className="cursor-pointer">
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
            disabled={loading || !prompt.trim()}
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
    </InputGroup>
  );

  // New Chat page
  if (isEmptyState) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center p-8 pb-[10%]">
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex flex-row gap-4 w-full max-w-3xl mb-6">
            <h1 className="scroll-m-20 text-3xl font-semibold text-balance flex">
              Greetings 👋
            </h1>
          </div>

          {inputGroup}

          {welcomeMessage && (
            <div className="mt-6 flex justify-center px-4">
              <Button
                variant="outline"
                className="cursor-pointer text-sm text-muted-foreground h-auto whitespace-normal text-center max-w-full"
                onClick={() => sendMessage(welcomeMessage)}
              >
                &quot;{welcomeMessage}&quot;
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
          <div className="text-muted-foreground text-xs mt-4 max-w-3xl text-center w-full">
            <p>Lithium is AI and can make mistakes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
