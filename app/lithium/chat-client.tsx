'use client';

import { useState, useEffect } from "react";
import { ArrowUpIcon, ChevronDown, Plus } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner"
import { generateContent, type ChatMessage } from "./actions";
import { createChat, saveMessage, getMessages, updateChatTitle, type Message } from "./chat-actions";
import Image from 'next/image'


const models = [
  { id: 'openrouter:arcee-ai/trinity-large-preview:free', label: 'Trinity Large', icon: '/lithium/arcee.png', shortcut: 'Preview' },
  { id: 'openrouter:stepfun/step-3.5-flash:free', label: 'Step 3.5 Flash', icon: '/lithium/stepfun.png', shortcut: '' },
  { id: 'openrouter:z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air', icon: '/lithium/zai.png', shortcut: '' },
  { id: 'openrouter:deepseek/deepseek-r1-0528:free', label: 'R1', icon: '/lithium/deepseek.png', shortcut: '0528' },
  { id: 'openrouter:nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano', icon: '/lithium/nvidia.png', shortcut: '30B' },
  
  // Unreliable sub-optimal models
  { id: 'openrouter:openai/gpt-oss-120b:free', label: 'GPT OSS', icon: '/lithium/openai.png', shortcut: '120B' },
  { id: 'openrouter:meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 Instruct', icon: '/lithium/meta.png', shortcut: '70B' },

  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', icon: '/lithium/google.png', shortcut: 'Preview' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', icon: '/lithium/google.png', shortcut: '' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash', icon: '/lithium/google.png', shortcut: 'Lite' },
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


export function ChatClient({ chatId, onChatCreated }: {
  chatId?: string | null;
  onChatCreated?: (chatId: string, title: string) => void;
}) {
  const [welcomeMessage, setwelcomeMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedModel, setSelectedModel] = useState("openrouter:arcee-ai/trinity-large-preview:free");
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId ?? null);

  useEffect(() => {
    setwelcomeMessage(sampleQueries[Math.floor(Math.random() * sampleQueries.length)]);
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

  const handleSend = async () => {
    if (!prompt.trim()) return;
    
    const userMessage = prompt.trim();
    setLoading(true);
    setPrompt("");

    // Add user message to local state immediately
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);

    try {
      // Create chat on first message if no chatId
      let activeChatId = currentChatId;
      if (!activeChatId) {
        const newChat = await createChat(selectedModel);
        activeChatId = newChat.id;
        setCurrentChatId(activeChatId);

        // Auto-generate title from first message (first 50 chars)
        const title = userMessage.length > 50 ? userMessage.slice(0, 50) + '…' : userMessage;
        await updateChatTitle(activeChatId, title);
        onChatCreated?.(activeChatId, title);
      }

      // Save user message to database
      await saveMessage(activeChatId, 'user', userMessage);

      // Generate AI response with full history
      const history = messages; // messages before the current user message
      const result = await generateContent(userMessage, selectedModel, history);
      const assistantContent = result ?? "Sorry, I couldn't generate a response.";

      // Save assistant message to database
      await saveMessage(activeChatId, 'assistant', assistantContent);

      // Add assistant message to local state
      setMessages(prev => [...prev, { role: 'assistant' as const, content: assistantContent }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant' as const, content: "An error occurred while fetching the response." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-12 space-y-6">
        {loadingHistory ? (
          <p className="p-4 text-muted-foreground italic flex items-center gap-2">
            <Spinner /> Loading conversation...
          </p>
        ) : messages.length === 0 && !loading ? (
          <p className="p-4 text-muted-foreground italic flex items-center gap-2">
            {welcomeMessage ? <>"{welcomeMessage}"</> : ""}
          </p>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-muted' : ''}`}>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {msg.role === 'user' ? 'You' : 'Lithium'}
                </p>
                <div className="overflow-x-auto">
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
                  src={models.find(m => m.id === selectedModel)?.icon ?? ''} 
                  alt={models.find(m => m.id === selectedModel)?.label ?? 'Model icon'}
                  width={16} 
                  height={16}
                  className="mr-1"
                />
                {models.find(m => m.id === selectedModel)?.label}
                <ChevronDown />
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start">
              <DropdownMenuLabel>Models</DropdownMenuLabel>

              {models.map((model) => (
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
              <span className="hidden lg:inline">{`${prompt.length} ${prompt.length === 1 ? 'character' : 'characters'}`}</span>
            )}
          </InputGroupText>
          <Separator orientation="vertical" className="!h-4" />
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

    </div>
  );
}
