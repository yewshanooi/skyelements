'use client';

import { useState } from "react";
import { ArrowUpIcon, Plus } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { generateContent } from "./actions";

export function ChatInterface({ userEmail }: { userEmail: string }) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

  const handleSend = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
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
           <div className="leading-7 px-6 prose prose-neutral dark:prose-invert max-w-none">
             <ReactMarkdown>{response}</ReactMarkdown>
           </div>
         ) : (
           <p className="leading-7 pt-6 px-6 text-muted-foreground italic">
            {loading ? "Thinking..." : `Nice to see you, ${userEmail}. What's New?`}
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
              <InputGroupButton variant="secondary">
                {selectedModel === "gemini-2.5-flash" && "Gemini 2.5 Flash"}
                {selectedModel === "gemini-2.5-flash-lite" && "Gemini 2.5 Flash Lite"}
                {selectedModel === "gemini-3-flash-preview" && "Gemini 3 Flash (Preview)"}
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="[--radius:0.95rem]"
            >
              <DropdownMenuItem onSelect={() => setSelectedModel("gemini-2.5-flash")}>Gemini 2.5 Flash</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSelectedModel("gemini-2.5-flash-lite")}>Gemini 2.5 Flash Lite</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSelectedModel("gemini-3-flash-preview")}>Gemini 3 Flash (Preview)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <InputGroupText className="ml-auto">
            {prompt.length > 0 ? `${prompt.length} ${prompt.length === 1 ? 'character' : 'characters'}` : ''}
          </InputGroupText>
          <Separator orientation="vertical" className="!h-4" />
          <InputGroupButton
            variant="default"
            className="rounded-full"
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
