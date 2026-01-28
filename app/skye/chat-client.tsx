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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner"
import { generateContent } from "./actions";
import Image from 'next/image'

const models = [
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', icon: '/skye/google.png', shortcut: 'Preview' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', icon: '/skye/google.png', shortcut: '' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash', icon: '/skye/google.png', shortcut: 'Lite' },
  { id: 'openrouter:google/gemma-3-27b-it:free', label: 'Gemma 3', icon: '/skye/google.png', shortcut: '27B' },
  { id: 'openrouter:tngtech/deepseek-r1t2-chimera:free', label: 'R1T2 Chimera', icon: '/skye/deepseek.png', shortcut: '' },
  { id: 'openrouter:deepseek/deepseek-r1-0528:free', label: 'R1', icon: '/skye/deepseek.png', shortcut: '0528' },
  { id: 'openrouter:z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air', icon: '/skye/zai.png', shortcut: '' },
  { id: 'openrouter:qwen/qwen3-coder:free', label: 'Qwen3 Coder', icon: '/skye/qwen.png', shortcut: '480B' },
  { id: 'openrouter:qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 Next Instruct', icon: '/skye/qwen.png', shortcut: '80B' },
  { id: 'openrouter:meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 Instruct', icon: '/skye/meta.png', shortcut: '70B' },
  { id: 'openrouter:nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano', icon: '/skye/nvidia.png', shortcut: '30B' },
  { id: 'openrouter:openai/gpt-oss-120b:free', label: 'GPT OSS', icon: '/skye/openai-black.png', shortcut: '120B' },
  { id: 'openrouter:mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small 3.1', icon: '/skye/mistral.png', shortcut: '24B' }
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


export function ChatClient() {
  const [welcomeMessage, setwelcomeMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

  useEffect(() => {
    setwelcomeMessage(sampleQueries[Math.floor(Math.random() * sampleQueries.length)]);
  }, []);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setResponse(null);
    setPrompt("");

    try {
      const result = await generateContent(prompt, selectedModel);
      setResponse(result ?? null);
    } catch (error) {
      console.error(error);
      setResponse("An error occurred while fetching the response.");
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
      <div className="mt-12 mb-12">
         {response ? (
            <Card className="w-full">
              <CardHeader>
                <CardDescription>
                  <div className="p-2 text-base">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {response}
                    </ReactMarkdown>
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
         ) : (
            <Card className="w-full">
              <CardHeader>
                <CardDescription>
                  <p className="p-2 text-base italic flex items-center gap-2">
                    {loading ? <><Spinner /> Thinking...</> : welcomeMessage ? <>"{welcomeMessage}"</> : ""}
                  </p>
                </CardDescription>
              </CardHeader>
            </Card>
         )}
      </div>
  
      <InputGroup>
        <InputGroupTextarea 
          placeholder="Ask Skye" 
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
              <span className="hidden md:inline">{`${prompt.length} ${prompt.length === 1 ? 'character' : 'characters'}`}</span>
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
