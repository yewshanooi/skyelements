"use client";

import { useState, useRef, useEffect } from 'react';
import type { FC, KeyboardEvent } from 'react';
import {
  Sparkles,
  X,
  Minus,
  Maximize2,
  Minimize2,
  ArrowUp,
  Trash2,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  ShoppingBag,
  TrendingUp,
  Users,
  Clock,
  RotateCcw,
} from 'lucide-react';
import type { SaleItem, ViewMode } from '@/types/sales';
import {
  sendSalesAiMessage,
  type ChatMessage,
} from '@/services/sales/geminiService';
import { AiMarkdown } from './AiMarkdown';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SaleItem[];
  onCreateSale: (sale: Omit<SaleItem, 'id'>) => Promise<SaleItem>;
  onUpdateSale: (id: string, updates: Partial<SaleItem>) => Promise<void>;
  onDeleteSale: (id: string) => Promise<void>;
  onSwitchView: (view: ViewMode) => void;
  onSetSearch: (query: string) => void;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  0: {
    0: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

const STORAGE_KEY_CHAT_HISTORY = 'sales_dashboard_ai_chat_history_v1';

function createInitialWelcomeMessage(): ChatMessage {
  const ts = Date.now();
  return {
    id: `welcome-${ts}`,
    role: 'model',
    text: `Hi there, how can I assist you today?`,
    timestamp: ts,
  };
}

function createUserMessage(text: string): ChatMessage {
  const ts = Date.now();
  return {
    id: `user-${ts}`,
    role: 'user',
    text,
    timestamp: ts,
  };
}

function createErrorMessage(errorMessageText: string): ChatMessage {
  const ts = Date.now();
  return {
    id: `err-${ts}`,
    role: 'model',
    text: `⚠️ **Error executing request**:\n\n${errorMessageText}`,
    timestamp: ts,
    error: true,
  };
}

export const AiAssistantDrawer: FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  sales,
  onCreateSale,
  onUpdateSale,
  onDeleteSale,
  onSwitchView,
  onSetSearch,
}) => {
  // Local state for messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHAT_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [createInitialWelcomeMessage()];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Floating Window Geometry (Position & Dimensions)
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('sales_ai_window_pos');
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return null;
  });

  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem('sales_ai_window_size');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.width >= 300 && parsed.height >= 380) {
          if (parsed.width === 440) return { width: 380, height: parsed.height };
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return { width: 380, height: 600 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [resizingDir, setResizingDir] = useState<string | null>(null);

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({
    mouseX: 0,
    mouseY: 0,
    posX: 0,
    posY: 0,
  });

  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    width: number;
    height: number;
    posX: number;
    posY: number;
  }>({
    mouseX: 0,
    mouseY: 0,
    width: 380,
    height: 600,
    posX: 0,
    posY: 0,
  });

  // Calculate default position when not explicitly set
  const getEffectivePosition = () => {
    if (position) return position;
    const defaultX = Math.max(16, window.innerWidth - size.width - 24);
    const defaultY = Math.max(16, window.innerHeight - size.height - 24);
    return { x: defaultX, y: defaultY };
  };

  const handleResetWindow = () => {
    const defaultW = 380;
    const defaultH = 600;
    const defaultX = Math.max(16, window.innerWidth - defaultW - 24);
    const defaultY = Math.max(16, window.innerHeight - defaultH - 24);
    setSize({ width: defaultW, height: defaultH });
    setPosition({ x: defaultX, y: defaultY });
    setIsFullscreen(false);
    localStorage.removeItem('sales_ai_window_pos');
    localStorage.removeItem('sales_ai_window_size');
  };

  const handleCloseAndClear = () => {
    handleClearChat();
    setIsMinimized(false);
    setIsFullscreen(false);
    onClose();
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const currentPosRef = useRef(position);
  const currentSizeRef = useRef(size);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    currentPosRef.current = position;
  }, [position]);

  useEffect(() => {
    currentSizeRef.current = size;
  }, [size]);

  // Dragging and Resizing Global Mouse Event Handlers (Butter-smooth with rAF)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !resizingDir) return;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        if (isDragging) {
          const deltaX = e.clientX - dragStartRef.current.mouseX;
          const deltaY = e.clientY - dragStartRef.current.mouseY;

          const newX = Math.min(Math.max(8, dragStartRef.current.posX + deltaX), window.innerWidth - 80);
          const newY = Math.min(Math.max(8, dragStartRef.current.posY + deltaY), window.innerHeight - 60);

          const newPos = { x: newX, y: newY };
          setPosition(newPos);
        } else if (resizingDir) {
          const dx = e.clientX - resizeStartRef.current.mouseX;
          const dy = e.clientY - resizeStartRef.current.mouseY;

          const minW = 300;
          const maxW = Math.min(950, window.innerWidth - 16);
          const minH = 380;
          const maxH = Math.min(900, window.innerHeight - 16);

          let newW = resizeStartRef.current.width;
          let newH = resizeStartRef.current.height;
          let newX = resizeStartRef.current.posX;
          let newY = resizeStartRef.current.posY;

          if (resizingDir.includes('e')) {
            newW = Math.min(Math.max(minW, resizeStartRef.current.width + dx), maxW);
          }
          if (resizingDir.includes('w')) {
            const rawW = resizeStartRef.current.width - dx;
            const clampedW = Math.min(Math.max(minW, rawW), maxW);
            newW = clampedW;
            newX = Math.max(8, resizeStartRef.current.posX + (resizeStartRef.current.width - clampedW));
          }
          if (resizingDir.includes('s')) {
            newH = Math.min(Math.max(minH, resizeStartRef.current.height + dy), maxH);
          }
          if (resizingDir.includes('n')) {
            const rawH = resizeStartRef.current.height - dy;
            const clampedH = Math.min(Math.max(minH, rawH), maxH);
            newH = clampedH;
            newY = Math.max(8, resizeStartRef.current.posY + (resizeStartRef.current.height - clampedH));
          }

          const newSize = { width: newW, height: newH };
          const newPos = { x: newX, y: newY };
          setSize(newSize);
          setPosition(newPos);
        }
      });
    };

    const handleMouseUp = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (isDragging || resizingDir) {
        setIsDragging(false);
        setResizingDir(null);

        // Commit saved position & size to localStorage on mouseUp
        try {
          if (currentPosRef.current) {
            localStorage.setItem('sales_ai_window_pos', JSON.stringify(currentPosRef.current));
          }
          if (currentSizeRef.current) {
            localStorage.setItem('sales_ai_window_size', JSON.stringify(currentSizeRef.current));
          }
        } catch {
          /* ignore */
        }
      }
    };

    if (isDragging || resizingDir) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isDragging ? 'grabbing' : '';
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, resizingDir]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, textarea, a')) return;

    const currentPos = getEffectivePosition();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: currentPos.x,
      posY: currentPos.y,
    };
    setIsDragging(true);
  };

  const handleResizeStart = (e: React.MouseEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();

    const currentPos = getEffectivePosition();
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: size.width,
      height: size.height,
      posX: currentPos.x,
      posY: currentPos.y,
    };
    setResizingDir(dir);
  };

  // Quick Action Prompts
  const quickPrompts = [
    {
      label: 'Sales Summary',
      prompt: 'Give me a complete summary of total revenue, costs, net profit, and average order value.',
      icon: <TrendingUp className="w-3 h-3 text-blue-500" />,
    },
    {
      label: 'Top Customers',
      prompt: 'Who are our top 5 customers by total spending and order volume?',
      icon: <Users className="w-3 h-3 text-emerald-500" />,
    },
    {
      label: 'Unshipped Orders',
      prompt: 'List all orders that are currently "Processing" or have not been shipped yet.',
      icon: <Clock className="w-3 h-3 text-amber-500" />,
    },
    {
      label: 'Unpaid Orders',
      prompt: 'Show all orders with payment status "On Hold" or "Processing".',
      icon: <ShoppingBag className="w-3 h-3 text-rose-500" />,
    },
    {
      label: 'Create Sample Order',
      prompt: 'Create a new order: 2 Pokemon Ultra Prism Booster Packs for RM 280 total, cost RM 160, customer "Daniel Tan", sold on Shopee today, Paid and Shipped.',
      icon: <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
    },
  ];

  // Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputQuery).trim();
    if (!query || isLoading) return;

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMessage = createUserMessage(query);

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const serverResponse = await sendSalesAiMessage(
        messages,
        query,
        sales
      );

      let createdSale: SaleItem | undefined;
      let updatedSale: { item: SaleItem; changes: Record<string, { before: unknown; after: unknown }> } | undefined;

      if (serverResponse.createdSalePayload) {
        createdSale = await onCreateSale(serverResponse.createdSalePayload);
      }

      if (serverResponse.updatedSalePayload) {
        await onUpdateSale(serverResponse.updatedSalePayload.id, serverResponse.updatedSalePayload.updates);
        updatedSale = {
          item: serverResponse.updatedSalePayload.item,
          changes: serverResponse.updatedSalePayload.changes,
        };
      }

      if (serverResponse.switchView) {
        onSwitchView(serverResponse.switchView);
      }

      if (serverResponse.filterQuery !== undefined) {
        onSetSearch(serverResponse.filterQuery);
      }

      const aiResponse: ChatMessage = {
        id: serverResponse.id,
        role: 'model',
        text: serverResponse.text,
        timestamp: serverResponse.timestamp,
        toolCalls: serverResponse.toolCalls,
        createdSale,
        updatedSale,
        pendingDelete: serverResponse.pendingDelete,
        actionExecuted: serverResponse.actionExecuted,
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cleanly cancelled
      }
      console.error('AI query error:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error occurred while contacting Gemini API.';
      const errorMessage = createErrorMessage(errMsg);
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clear chat history
  const handleClearChat = () => {
    setMessages([createInitialWelcomeMessage()]);
    localStorage.removeItem(STORAGE_KEY_CHAT_HISTORY);
  };

  // Voice Dictation (Web Speech API)
  const handleToggleVoice = () => {
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRecognitionConstructor =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputQuery((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Confirm delete execution from interactive card
  const handleConfirmDelete = async (msgId: string, saleId: string) => {
    try {
      await onDeleteSale(saleId);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === msgId && msg.pendingDelete) {
            return {
              ...msg,
              pendingDelete: {
                ...msg.pendingDelete,
                confirmed: true,
              },
              text: `${msg.text}\n\n✅ *Order has been deleted from the database.*`,
            };
          }
          return msg;
        })
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to delete sale: ${errMsg}`);
    }
  };

  const handleCancelDelete = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId && msg.pendingDelete) {
          return {
            ...msg,
            pendingDelete: {
              ...msg.pendingDelete,
              cancelled: true,
            },
            text: `${msg.text}\n\n❌ *Deletion was cancelled by user.*`,
          };
        }
        return msg;
      })
    );
  };

  if (!isOpen) return null;

  // Minimized Floating Pill UI (Preserves conversation state)
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
        <div
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-3 sm:px-3.5 py-2 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl border border-black/10 dark:border-white/15 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.25)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.35)] hover:scale-105 transition-all cursor-pointer select-none group"
          title="Click to expand AI chat"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            AI Assistant
          </span>
          <div className="flex items-center pl-1 border-l border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseAndClear();
              }}
              className="p-1 text-neutral-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
              title="Close & Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 768;
  const currentPos = getEffectivePosition();
  const windowStyle = isFullscreen
    ? {
        left: '8px',
        top: '8px',
        width: 'calc(100vw - 16px)',
        height: 'calc(100vh - 16px)',
      }
    : isMobileScreen
    ? {
        left: '8px',
        top: '56px',
        width: 'calc(100vw - 16px)',
        height: 'calc(100vh - 68px)',
      }
    : {
        left: `${currentPos.x}px`,
        top: `${currentPos.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        willChange: isDragging || resizingDir ? 'left, top, width, height' : 'auto',
      };

  return (
    <div
      style={windowStyle}
      className={`fixed z-50 flex flex-col bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] rounded-2xl sm:rounded-[22px] shadow-[0_24px_70px_rgba(0,0,0,0.28)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.6)] overflow-hidden font-sans ${
        isDragging || resizingDir
          ? 'transition-none select-none pointer-events-auto'
          : 'transition-[width,height,left,top] duration-150 ease-out'
      } ${isDragging ? 'shadow-[0_30px_90px_rgba(0,0,0,0.4)] ring-2 ring-[#2383e2]/30' : ''}`}
    >
      {/* 8-Directional Resize Handles (Desktop only) */}
      {!isFullscreen && !isMobileScreen && (
        <>
          <div
            onMouseDown={(e) => handleResizeStart(e, 'n')}
            className="absolute top-0 left-3 right-3 h-2 cursor-ns-resize z-30"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 's')}
            className="absolute bottom-0 left-3 right-3 h-2 cursor-ns-resize z-30"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'w')}
            className="absolute left-0 top-3 bottom-3 w-2 cursor-ew-resize z-30"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            className="absolute right-0 top-3 bottom-3 w-2 cursor-ew-resize z-30"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-30"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-30"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-30"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-end justify-end p-1"
          >
            <svg
              viewBox="0 0 6 6"
              className="w-2 h-2 text-neutral-300 dark:text-neutral-600 pointer-events-none"
              fill="currentColor"
            >
              <circle cx="5" cy="5" r="0.6" />
              <circle cx="5" cy="2.5" r="0.6" />
              <circle cx="2.5" cy="5" r="0.6" />
            </svg>
          </div>
        </>
      )}

      {/* macOS Window Header */}
      <div
        onMouseDown={isFullscreen || isMobileScreen ? undefined : handleHeaderMouseDown}
        onDoubleClick={handleToggleFullscreen}
        title={isFullscreen ? 'Double-click to restore window' : 'Drag to move • Double-click for full screen'}
        className={`px-4 py-3 bg-[#f6f6f6]/90 dark:bg-[#252528]/90 border-b border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl flex items-center justify-between select-none ${
          isFullscreen || isMobileScreen ? 'cursor-default' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Left: macOS Traffic Lights */}
        <div className="flex items-center gap-2">
          {/* Close & Clear (Red) */}
          <button
            type="button"
            onClick={handleCloseAndClear}
            className="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#FF5F56]/90 border border-[#E0443E]/70 flex items-center justify-center group/btn transition-transform active:scale-90 cursor-pointer"
            title="Close Window"
          >
            <X className="w-2 h-2 text-[#4A0002] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          </button>
          {/* Minimize (Yellow) */}
          <button
            type="button"
            onClick={handleMinimize}
            className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFBD2E]/90 border border-[#DEA123]/70 flex items-center justify-center group/btn transition-transform active:scale-90 cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-2 h-2 text-[#5E3F00] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
          </button>
          {/* Full Screen (Green) */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="w-3 h-3 rounded-full bg-[#27C93F] hover:bg-[#27C93F]/90 border border-[#1AAB29]/70 flex items-center justify-center group/btn transition-transform active:scale-90 cursor-pointer"
            title={isFullscreen ? 'Exit Full Screen' : 'Open Full Screen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-2 h-2 text-[#0B4F12] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[2.5]" />
            ) : (
              <Maximize2 className="w-2 h-2 text-[#0B4F12] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[2.5]" />
            )}
          </button>
        </div>

        {/* Center: Title */}
        <div className="flex items-center gap-2 pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 tracking-tight">
            AI Assistant
          </span>
        </div>

        {/* Right Toolbar: Reset Position & Clear History */}
        <div className="flex items-center gap-1">
          {!isFullscreen && (
            <button
              type="button"
              onClick={handleResetWindow}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
              title="Reset Window Position & Size"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fbfbfd] dark:bg-[#161618]">
        <div className={`flex flex-col space-y-4 ${isFullscreen ? 'max-w-3xl mx-auto w-full' : 'w-full'}`}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div
                  className={`text-[12.5px] leading-relaxed ${
                    isUser
                      ? 'max-w-[82%] bg-[#2383e2] text-white rounded-[18px] rounded-br-[4px] px-3.5 py-2.5 shadow-[0_1px_3px_rgba(35,131,226,0.25)]'
                      : msg.error
                      ? 'max-w-[88%] bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 rounded-[18px] rounded-bl-[4px] px-4 py-3 border border-red-200 dark:border-red-800/40 shadow-2xs'
                      : 'max-w-[88%] bg-white dark:bg-[#252528] text-neutral-900 dark:text-[#f5f5f7] rounded-[18px] rounded-bl-[4px] px-4 py-3 border border-black/[0.05] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                  }`}
                >
                  {/* Markdown text content */}
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <AiMarkdown content={msg.text} />
                  )}

                  {/* Apple-style Interactive Card: Created Order */}
                  {msg.createdSale && (
                    <div className="mt-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-[11.5px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Order Record Created
                        </span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-[12px]">
                          RM {msg.createdSale.subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 bg-white/70 dark:bg-black/20 p-2 rounded-lg border border-black/[0.04] dark:border-white/[0.04]">
                        <div>
                          <span className="text-neutral-400 dark:text-neutral-500">Order: </span>
                          <strong className="text-neutral-800 dark:text-neutral-200">
                            {msg.createdSale.item} (x{msg.createdSale.quantity})
                          </strong>
                        </div>
                        <div>
                          <span className="text-neutral-400 dark:text-neutral-500">Customer: </span>
                          <strong className="text-neutral-800 dark:text-neutral-200">
                            {msg.createdSale.customer}
                          </strong>
                        </div>
                        <div>
                          <span className="text-neutral-400 dark:text-neutral-500">Store: </span>
                          <span className="text-neutral-800 dark:text-neutral-200">
                            {msg.createdSale.marketplace}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-400 dark:text-neutral-500">Profit: </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                            RM {msg.createdSale.sales.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onSwitchView('table');
                          onSetSearch(msg.createdSale!.item);
                        }}
                        className="w-full py-1.5 bg-[#2383e2] hover:bg-[#1a6ebd] text-white rounded-lg text-[11.5px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View in Table</span>
                      </button>
                    </div>
                  )}

                  {/* Apple-style Interactive Card: Updated Order */}
                  {msg.updatedSale && (
                    <div className="mt-3 p-3 bg-blue-50/60 dark:bg-blue-950/25 border border-blue-500/20 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5 text-[11.5px]">
                          <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Order Record Updated
                        </span>
                        <span className="text-[11px] font-medium text-neutral-500">
                          {msg.updatedSale.item.customer}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                        {msg.updatedSale.item.item}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(msg.updatedSale.changes).map(([field, { after }]) => (
                          <span
                            key={field}
                            className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-[#2383e2]/10 text-[#2383e2] dark:bg-[#2383e2]/20 dark:text-blue-300"
                          >
                            {field}: {String(after)}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onSwitchView('table');
                          onSetSearch(msg.updatedSale!.item.item);
                        }}
                        className="w-full py-1.5 bg-[#2383e2] hover:bg-[#1a6ebd] text-white rounded-lg text-[11.5px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View in Table</span>
                      </button>
                    </div>
                  )}

                  {/* Apple-style Interactive Card: Delete Confirmation */}
                  {msg.pendingDelete && !msg.pendingDelete.confirmed && !msg.pendingDelete.cancelled && (
                    <div className="mt-3 p-3 bg-red-50/70 dark:bg-red-950/25 border border-red-500/25 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-red-800 dark:text-red-300 font-semibold text-[11.5px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        <span>Confirm Deletion</span>
                      </div>
                      <p className="text-neutral-700 dark:text-neutral-300 text-[11px] leading-relaxed">
                        Are you sure you want to permanently delete{' '}
                        <strong>&quot;{msg.pendingDelete.itemName}&quot;</strong> for{' '}
                        <strong>{msg.pendingDelete.customer}</strong> (RM{' '}
                        {msg.pendingDelete.subtotal.toFixed(2)})?
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCancelDelete(msg.id)}
                          className="flex-1 py-1.5 bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-medium cursor-pointer transition-colors active:scale-[0.98]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(msg.id, msg.pendingDelete!.id)}
                          className="flex-1 py-1.5 bg-[#FF3B30] hover:bg-[#E03126] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs active:scale-[0.98]"
                        >
                          Delete Order
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[9.5px] text-neutral-400 dark:text-neutral-500 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}

          {/* Apple-style Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-400 py-2.5 px-4 bg-white/90 dark:bg-[#252528]/90 border border-black/[0.04] dark:border-white/[0.06] rounded-[18px] w-fit shadow-xs">
              <div className="w-3.5 h-3.5 border-2 border-[#2383e2] border-t-transparent rounded-full animate-spin" />
              <span className="text-[11.5px] font-medium">Analyzing sales data...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Quick Action Chips */}
      {messages.length <= 3 && !isLoading && (
        <div className="px-3.5 py-2 bg-[#f6f6f6]/80 dark:bg-[#1e1e20]/80 border-t border-black/[0.04] dark:border-white/[0.06]">
          <div className={`flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar ${isFullscreen ? 'max-w-3xl mx-auto w-full' : ''}`}>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qp.prompt)}
                className="whitespace-nowrap px-3 py-1.5 bg-white dark:bg-[#2c2c2e] hover:bg-neutral-100 dark:hover:bg-[#343438] border border-black/[0.06] dark:border-white/[0.08] rounded-full text-[11px] font-medium text-neutral-700 dark:text-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                {qp.icon}
                <span>{qp.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Apple Capsule Input Area */}
      <div className="px-3.5 pt-3 pb-3 bg-[#f6f6f6]/95 dark:bg-[#202022]/95 border-t border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl">
        <div className={isFullscreen ? 'max-w-3xl mx-auto w-full' : 'w-full'}>
          <div className="relative flex items-end bg-white dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.1] rounded-[20px] p-2 focus-within:ring-2 focus-within:ring-[#2383e2]/40 focus-within:border-[#2383e2] transition-all shadow-2xs">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="w-full resize-none bg-transparent border-0 px-2.5 py-1 text-[12.5px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden leading-relaxed max-h-28"
            />

            <div className="flex items-center gap-1.5 pb-0.5 pr-0.5">
              {/* Siri Voice Dictation Button */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Voice Dictation'}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              {/* Apple Blue Circular Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isLoading}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  inputQuery.trim() && !isLoading
                    ? 'bg-[#2383e2] hover:bg-[#1a6ebd] text-white shadow-xs active:scale-90'
                    : 'text-neutral-400 dark:text-neutral-600 bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed opacity-40'
                }`}
                title="Send Message (Enter)"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 px-1.5 pt-2.5 pb-0.5 font-normal">
            <span>
              <kbd className="px-1 py-0.5 bg-black/[0.04] dark:bg-white/[0.08] rounded font-mono text-[9px] border border-black/[0.04] dark:border-white/[0.06]">Enter</kbd> to send
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-black/[0.04] dark:bg-white/[0.08] rounded font-mono text-[9px] border border-black/[0.04] dark:border-white/[0.06]">Ctrl + J</kbd> to open/close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
