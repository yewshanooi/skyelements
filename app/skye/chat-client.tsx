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
import { generateContent } from "./actions";

const models = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
];

const randomQueries = [
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

export function ChatClient({ userEmail }: { userEmail: string }) {
  const [welcomeMessage, setwelcomeMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

  useEffect(() => {
    setwelcomeMessage(randomQueries[Math.floor(Math.random() * randomQueries.length)]);
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
    <div className="w-full max-w-3xl mx-auto mt-12">
      <div className="min-h-[100px] mb-6">
         {response ? (
           <div className="px-6 prose prose-neutral dark:prose-invert max-w-none mb-12">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {response}
              </ReactMarkdown>
           </div>
         ) : (
           <p className="mt-6 px-6 text-muted-foreground italic flex items-center gap-2">
            {loading ? <><Spinner /> Thinking...</> : welcomeMessage ? <>Greetings, {userEmail}. <br/> Ask something like: "{welcomeMessage}"</> : ""}
           </p>
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
                {models.find(m => m.id === selectedModel)?.label}
                <ChevronDown />
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start">
              <DropdownMenuLabel>Model</DropdownMenuLabel>

              {models.map((model) => (
                <DropdownMenuItem 
                  key={model.id}
                  onSelect={() => setSelectedModel(model.id)} 
                  className="cursor-pointer"
                >
                  {model.label}
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
