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
  RotateCcw,
  CalendarDays,
  ChartPie,
  Trophy,
  Plus,
  Pencil,
  Square,
} from 'lucide-react';
import type { SaleItem, ViewMode } from '@/types/sales';
import { sendSalesAiMessage } from '@/services/sales/geminiService';
import type { ChatMessage } from '@/types/salesAi';
import { AiMarkdown } from './AiMarkdown';
import { AiChartCard } from './AiChartCard';
import { AiCreateOrderCard, AiUpdateOrderCard } from './AiOrderForms';

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

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(dateStr.trim());
  if (monthMatch) {
    const [, y, m] = monthMatch;
    return `${m}/${y}`;
  }
  return dateStr;
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pillsContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Abort pending request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Ensure quick query pills always reset to start alignment on open / reset
  useEffect(() => {
    if (pillsContainerRef.current) {
      pillsContainerRef.current.scrollLeft = 0;
    }
  }, [isOpen, messages.length]);

  const handlePillsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (pillsContainerRef.current && e.deltaY !== 0) {
      pillsContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Auto-scroll on new message so forms and responses are cleanly aligned under the header
  useEffect(() => {
    if (messages.length > 1) {
      const lastMsg = messages[messages.length - 1];
      const el = document.getElementById(`chat-msg-${lastMsg.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  }, [messages]);

  // Persist conversation history to localStorage on message updates
  useEffect(() => {
    try {
      if (messages.length > 0) {
        const trimmed = messages.slice(-25).map((m) => {
          if (m.chartSpec && m.chartSpec.data && m.chartSpec.data.length > 25) {
            return {
              ...m,
              chartSpec: {
                ...m.chartSpec,
                data: m.chartSpec.data.slice(0, 25),
              },
            };
          }
          return m;
        });
        localStorage.setItem(STORAGE_KEY_CHAT_HISTORY, JSON.stringify(trimmed));
      }
    } catch {
      /* ignore quota errors */
    }
  }, [messages]);

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
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return { width: 380, height: 600 };
  });

  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({
    mouseX: 0,
    mouseY: 0,
    posX: 0,
    posY: 0,
  });

  // Mobile touch swipe-down to dismiss state & closing animation
  const [isClosing, setIsClosing] = useState(false);
  const [mobileDragOffsetY, setMobileDragOffsetY] = useState(0);
  const [isMobileDragging, setIsMobileDragging] = useState(false);
  const mobileTouchStartRef = useRef<{ y: number; time: number }>({ y: 0, time: 0 });

  const handleMobileTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a') || isClosing) return;
    mobileTouchStartRef.current = {
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    setIsMobileDragging(true);
  };

  const handleMobileTouchMove = (e: React.TouchEvent) => {
    if (!isMobileDragging || isClosing) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - mobileTouchStartRef.current.y;
    if (deltaY > 0) {
      setMobileDragOffsetY(deltaY);
    } else {
      setMobileDragOffsetY(deltaY * 0.15);
    }
  };

  const handleClearChat = () => {
    setMessages([createInitialWelcomeMessage()]);
    localStorage.removeItem(STORAGE_KEY_CHAT_HISTORY);
  };

  const handleCloseWindow = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsMinimized(false);
      setIsFullscreen(false);
      setIsClosing(false);
      setMobileDragOffsetY(0);
      onClose();
    }, 280);
  };

  const handleMobileTouchEnd = () => {
    if (!isMobileDragging || isClosing) return;
    setIsMobileDragging(false);

    const touchDuration = Date.now() - mobileTouchStartRef.current.time;
    const deltaY = mobileDragOffsetY;

    // Fast flick down or pulled down more than 60px
    const isFlick = deltaY > 25 && touchDuration < 250;
    const isPulledEnough = deltaY > 60;

    if (isFlick || isPulledEnough) {
      handleCloseWindow();
    } else {
      setMobileDragOffsetY(0);
    }
  };

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

  // Dragging Global Mouse Event Handlers (Butter-smooth with rAF)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

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
        }
      });
    };

    const handleMouseUp = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (isDragging) {
        setIsDragging(false);

        // Commit saved position to localStorage on mouseUp
        try {
          if (currentPosRef.current) {
            localStorage.setItem('sales_ai_window_pos', JSON.stringify(currentPosRef.current));
          }
        } catch {
          /* ignore */
        }
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
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
  }, [isDragging]);

  // Resizing state & handlers for desktop floating window
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; startW: number; startH: number }>({
    mouseX: 0,
    mouseY: 0,
    startW: 380,
    startH: 600,
  });

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaX = e.clientX - resizeStartRef.current.mouseX;
      const deltaY = e.clientY - resizeStartRef.current.mouseY;

      const newWidth = Math.min(Math.max(340, resizeStartRef.current.startW + deltaX), window.innerWidth - 32);
      const newHeight = Math.min(Math.max(420, resizeStartRef.current.startH + deltaY), window.innerHeight - 32);

      setSize({ width: newWidth, height: newHeight });
    };

    const handleResizeUp = () => {
      if (isResizing) {
        setIsResizing(false);
        try {
          if (currentSizeRef.current) {
            localStorage.setItem('sales_ai_window_size', JSON.stringify(currentSizeRef.current));
          }
        } catch {
          /* ignore */
        }
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nwse-resize';
    }

    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startW: size.width,
      startH: size.height,
    };
    setIsResizing(true);
  };

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

  // Quick Action Prompts (3 Analytics based + 2 Sales Order CRUD based)
  const quickPrompts: Array<{
    label: string;
    prompt: string;
    icon: React.ReactNode;
    action: 'send' | 'create_form' | 'update_form';
  }> = [
      {
        label: 'Monthly Trend',
        prompt: 'Show our monthly revenue and net profit breakdown in a table.',
        icon: <CalendarDays className="w-3 h-3 text-blue-500" />,
        action: 'send',
      },
      {
        label: 'Category Breakdown',
        prompt: 'Break down revenue and net profit by product category in a table.',
        icon: <ChartPie className="w-3 h-3 text-purple-500" />,
        action: 'send',
      },
      {
        label: 'Top 5 Customers',
        prompt: 'Who are our top 5 customers ranked by total spend? Show in a table.',
        icon: <Trophy className="w-3 h-3 text-amber-500" />,
        action: 'send',
      },
      {
        label: 'Create New Order',
        prompt: 'Create New Order',
        icon: <Plus className="w-3 h-3 text-emerald-500" />,
        action: 'create_form',
      },
      {
        label: 'Edit Existing Order',
        prompt: 'Edit Existing Order',
        icon: <Pencil className="w-3 h-3 text-orange-500" />,
        action: 'update_form',
      },
    ];

  // Stop ongoing AI chat execution handler
  const handleStopExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `stopped-${Date.now()}`,
        role: 'model',
        text: '❌ *Response stopped.*',
        timestamp: Date.now(),
      },
    ]);
  };

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

    // Prune history & sales snapshots to reduce server action payload size and latency
    const prunedHistory: ChatMessage[] = [...messages, userMessage].slice(-10).map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      timestamp: m.timestamp,
    }));

    const prunedSales = sales.slice(0, 100).map((s) => ({
      id: s.id,
      date: s.date,
      item: s.item,
      quantity: s.quantity,
      subtotal: s.subtotal,
      cost: s.cost,
      sales: s.sales,
      customer: s.customer,
      category: s.category,
      marketplace: s.marketplace,
      order_status: s.order_status,
      payment_status: s.payment_status,
    })) as SaleItem[];

    try {
      const abortPromise = new Promise<never>((_, reject) => {
        if (abortController.signal.aborted) {
          const err = new Error('The user aborted a request.');
          err.name = 'AbortError';
          reject(err);
        } else {
          abortController.signal.addEventListener('abort', () => {
            const err = new Error('The user aborted a request.');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });

      const serverResponse = await Promise.race([
        sendSalesAiMessage(prunedHistory, query, prunedSales),
        abortPromise,
      ]);

      if (abortController.signal.aborted) {
        return;
      }

      if (serverResponse.error) {
        const errorMessage: ChatMessage = {
          id: serverResponse.id,
          role: 'model',
          text: serverResponse.text,
          timestamp: serverResponse.timestamp,
          error: true,
          errorMessage: serverResponse.errorMessage,
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      const aiResponse: ChatMessage = {
        id: serverResponse.id,
        role: 'model',
        text: serverResponse.text,
        timestamp: serverResponse.timestamp,
        toolCalls: serverResponse.toolCalls,
        chartSpec: serverResponse.chartSpec,
        pendingDelete: serverResponse.pendingDelete,
        pendingCreateForm: serverResponse.pendingCreateForm,
        pendingUpdateForm: serverResponse.pendingUpdateForm,
        actionExecuted: serverResponse.actionExecuted,
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (err: unknown) {
      if (
        (err instanceof Error && err.name === 'AbortError') ||
        abortController.signal.aborted
      ) {
        return; // Request was cleanly cancelled by user
      }
      console.error('AI query error:', err);
      let errMsg = err instanceof Error ? err.message : 'Unknown error occurred while contacting Gemini API.';
      if (
        errMsg.includes('Server Components render') ||
        errMsg.includes('omitted in production')
      ) {
        errMsg = 'The AI service encountered a temporary server error. Please try again in a few moments.';
      }
      const errorMessage = createErrorMessage(errMsg);
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading) {
        handleSendMessage();
      }
    } else if (e.key === 'Escape' && isLoading) {
      e.preventDefault();
      handleStopExecution();
    }
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

  // Confirm and Cancel handlers for Interactive Creation Form Card
  const handleConfirmCreateForm = async (msgId: string, payload: Omit<SaleItem, 'id'>) => {
    try {
      const created = await onCreateSale(payload);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === msgId) {
            return {
              ...msg,
              text: `✅ **Order Created**: Successfully recorded **"${created.item}"** for **${created.customer}** (RM ${created.subtotal.toFixed(2)}).`,
              pendingCreateForm: {
                ...msg.pendingCreateForm,
                confirmed: true,
              },
              createdSale: created,
            };
          }
          return msg;
        })
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      alert(`Failed to create order: ${errMsg}`);
    }
  };

  const handleCancelCreateForm = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId) {
          return {
            ...msg,
            text: `❌ *Order creation was cancelled.*`,
            pendingCreateForm: {
              ...msg.pendingCreateForm,
              cancelled: true,
            },
          };
        }
        return msg;
      })
    );
  };

  // Confirm and Cancel handlers for Interactive Update Form Card
  const handleConfirmUpdateForm = async (
    msgId: string,
    saleId: string,
    updates: Partial<SaleItem>
  ) => {
    try {
      const targetSale = sales.find((s) => s.id === saleId);
      if (!targetSale) throw new Error('Selected order not found.');

      await onUpdateSale(saleId, updates);

      const changes: Record<string, { before: unknown; after: unknown }> = {};
      for (const [k, v] of Object.entries(updates)) {
        const key = k as keyof SaleItem;
        changes[k] = { before: targetSale[key], after: v };
      }
      const updatedItem: SaleItem = { ...targetSale, ...updates };

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === msgId) {
            return {
              ...msg,
              text: `✅ **Order Updated**: Successfully updated **"${updatedItem.item}"** for **${updatedItem.customer}**.`,
              pendingUpdateForm: {
                ...msg.pendingUpdateForm,
                confirmed: true,
              },
              updatedSale: {
                item: updatedItem,
                changes,
              },
            };
          }
          return msg;
        })
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      alert(`Failed to update order: ${errMsg}`);
    }
  };

  const handleCancelUpdateForm = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId) {
          return {
            ...msg,
            text: `❌ *Order update was cancelled.*`,
            pendingUpdateForm: {
              ...msg.pendingUpdateForm,
              cancelled: true,
            },
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
                handleCloseWindow();
              }}
              className="p-1 text-neutral-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
              title="Close Window"
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

  // Desktop-only floating geometry
  const desktopWindowStyle: React.CSSProperties = isFullscreen
    ? {
      left: '8px',
      top: '8px',
      width: 'calc(100vw - 16px)',
      height: 'calc(100vh - 16px)',
      opacity: isClosing ? 0 : 1,
      transform: isClosing ? 'scale(0.96)' : 'scale(1)',
      transition: 'opacity 0.22s ease, transform 0.22s ease',
    }
    : {
      left: `${currentPos.x}px`,
      top: `${currentPos.y}px`,
      width: `${size.width}px`,
      height: `${size.height}px`,
      willChange: isDragging || isResizing ? 'left, top, width, height' : 'auto',
      opacity: isClosing ? 0 : 1,
      transform: isClosing ? 'scale(0.96)' : 'scale(1)',
      transition: isClosing
        ? 'opacity 0.22s ease, transform 0.22s ease'
        : isDragging || isResizing
          ? 'none'
          : 'width 0.15s ease-out, height 0.15s ease-out, left 0.15s ease-out, top 0.15s ease-out',
    };

  const mobileSheetStyle: React.CSSProperties = {
    transform: isClosing
      ? 'translateY(100%)'
      : isMobileDragging
        ? `translateY(${Math.max(0, mobileDragOffsetY)}px)`
        : 'translateY(0px)',
    transition: isMobileDragging
      ? 'none'
      : 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
  };

  const backdropOpacity = isClosing
    ? 0
    : isMobileDragging
      ? Math.max(0, 1 - mobileDragOffsetY / 300)
      : 1;

  return (
    <>
      {/* Mobile Backdrop Scrim (Clean dark overlay without background blur trap) */}
      <div
        style={{
          opacity: backdropOpacity,
          transition: isMobileDragging ? 'none' : 'opacity 0.28s ease',
          pointerEvents: isClosing ? 'none' : 'auto',
        }}
        className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 md:hidden overscroll-none touch-none"
        onClick={handleCloseWindow}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Main AI Assistant Dialog (Fixed iOS Bottom Sheet on Mobile with Swipe Down to Dismiss, Floating Draggable Window on Desktop) */}
      <div
        style={isMobileScreen ? mobileSheetStyle : desktopWindowStyle}
        className={`fixed z-50 flex flex-col bg-white/98 dark:bg-[#1c1c1e]/98 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] overflow-hidden font-sans overscroll-contain
          /* Fixed iOS Bottom Sheet Layout on Mobile */
          inset-x-0 bottom-0 top-12 rounded-t-[28px] shadow-[0_-8px_32px_rgba(0,0,0,0.2)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.6)] animate-in slide-in-from-bottom-4 duration-200
          /* Floating Draggable Window Layout on Desktop (md+) */
          md:inset-auto md:rounded-[22px] md:shadow-[0_24px_70px_rgba(0,0,0,0.28)] md:dark:shadow-[0_24px_70px_rgba(0,0,0,0.6)] md:animate-none
          ${isDragging || isResizing ? 'transition-none select-none pointer-events-auto shadow-[0_30px_90px_rgba(0,0,0,0.4)] ring-2 ring-[#2383e2]/30' : ''}`}
      >

        {/* 1. Mobile iOS Navigation Header (iOS Sheet UI with Touch Swipe Down to Dismiss) */}
        <div
          onTouchStart={handleMobileTouchStart}
          onTouchMove={handleMobileTouchMove}
          onTouchEnd={handleMobileTouchEnd}
          onTouchCancel={handleMobileTouchEnd}
          className="block md:hidden bg-[#fbfbfd]/95 dark:bg-[#1c1c1e]/95 border-b border-neutral-200/80 dark:border-neutral-800 backdrop-blur-xl select-none touch-none cursor-grab active:cursor-grabbing"
        >
          {/* Apple HIG Sheet Grabber (36px x 5px, centered with 5px top offset) */}
          <div className="pt-2 pb-1 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-[5px] bg-neutral-300 dark:bg-neutral-600 rounded-full" />
          </div>

          <div className="px-4 pb-2.5 flex items-center justify-between">
            {/* Left: Sparkles & Title */}
            <div className="flex items-center gap-2 pointer-events-none">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                AI Assistant
              </h3>
            </div>

            {/* Right: Clear Chat & iOS Close Button */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearChat}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCloseWindow}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Close Window"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Desktop macOS Window Header */}
        <div
          onMouseDown={isFullscreen ? undefined : handleHeaderMouseDown}
          onDoubleClick={handleToggleFullscreen}
          title={isFullscreen ? 'Double-click to restore window' : 'Drag to move • Double-click for full screen'}
          className={`hidden md:flex px-4 py-3 bg-[#f6f6f6]/90 dark:bg-[#252528]/90 border-b border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl items-center justify-between select-none ${isFullscreen ? 'cursor-default' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
        >
          {/* Left: macOS Traffic Lights (Boundary around all 3 reveals all icons on hover) */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center gap-2 group/traffic py-0.5 px-1 -ml-1 rounded-md cursor-default"
          >
            {/* Close (Red) */}
            <button
              type="button"
              onClick={handleCloseWindow}
              className="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#FF5F56]/90 border border-[#E0443E]/70 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              title="Close Window"
            >
              <X className="w-2 h-2 text-[#4A0002] opacity-0 group-hover/traffic:opacity-100 transition-opacity duration-150" />
            </button>
            {/* Minimize (Yellow) */}
            <button
              type="button"
              onClick={handleMinimize}
              className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFBD2E]/90 border border-[#DEA123]/70 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              title="Minimize"
            >
              <Minus className="w-2 h-2 text-[#5E3F00] opacity-0 group-hover/traffic:opacity-100 transition-opacity duration-150 stroke-[3]" />
            </button>
            {/* Full Screen (Green) */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="w-3 h-3 rounded-full bg-[#27C93F] hover:bg-[#27C93F]/90 border border-[#1AAB29]/70 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              title={isFullscreen ? 'Exit Full Screen' : 'Open Full Screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-2 h-2 text-[#0B4F12] opacity-0 group-hover/traffic:opacity-100 transition-opacity duration-150 stroke-[2.5]" />
              ) : (
                <Maximize2 className="w-2 h-2 text-[#0B4F12] opacity-0 group-hover/traffic:opacity-100 transition-opacity duration-150 stroke-[2.5]" />
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
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-4 space-y-3.5 bg-[#fbfbfd] dark:bg-[#161618]"
        >
          <div className={`flex flex-col space-y-3.5 ${isFullscreen ? 'max-w-3xl mx-auto w-full' : 'w-full'}`}>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isCard = Boolean(msg.pendingCreateForm || msg.pendingUpdateForm || msg.chartSpec);
              return (
                <div
                  key={msg.id}
                  id={`chat-msg-${msg.id}`}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${isCard ? 'w-full' : ''} space-y-1`}
                >
                  <div
                    className={`text-[12.5px] leading-relaxed ${isUser
                      ? 'max-w-[82%] bg-[#2383e2] text-white rounded-[18px] rounded-br-[4px] px-3.5 py-2.5 shadow-[0_1px_3px_rgba(35,131,226,0.25)]'
                      : msg.error
                        ? 'max-w-[88%] bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 rounded-[18px] rounded-bl-[4px] px-4 py-3 border border-red-200 dark:border-red-800/40 shadow-2xs'
                        : isCard
                          ? 'w-full max-w-full bg-white dark:bg-[#252528] text-neutral-900 dark:text-[#f5f5f7] rounded-[18px] rounded-bl-[4px] p-2.5 sm:p-3.5 border border-black/[0.05] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                          : 'max-w-[88%] bg-white dark:bg-[#252528] text-neutral-900 dark:text-[#f5f5f7] rounded-[18px] rounded-bl-[4px] px-4 py-3 border border-black/[0.05] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                      }`}
                  >
                    {/* Markdown text content */}
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <AiMarkdown
                        content={
                          msg.chartSpec
                            ? msg.text
                              .split('\n')
                              .filter((l) => !(l.trim().startsWith('|') && l.trim().endsWith('|')))
                              .join('\n')
                              .trim()
                            : msg.text
                        }
                      />
                    )}

                    {/* Deterministic Semantic Chart Visualization */}
                    {msg.chartSpec && <AiChartCard chartSpec={msg.chartSpec} />}

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
                            <span className="text-neutral-400 dark:text-neutral-500">Date: </span>
                            <span className="text-neutral-800 dark:text-neutral-200">
                              {formatDisplayDate(msg.createdSale.date)}
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
                              {field}: {field === 'date' && typeof after === 'string' ? formatDisplayDate(after) : String(after)}
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

                    {/* Interactive Form Card: New Sale Creation */}
                    {msg.pendingCreateForm && !msg.pendingCreateForm.confirmed && !msg.pendingCreateForm.cancelled && (
                      <AiCreateOrderCard
                        initialValues={msg.pendingCreateForm.initialValues}
                        onConfirm={(payload) => handleConfirmCreateForm(msg.id, payload)}
                        onCancel={() => handleCancelCreateForm(msg.id)}
                      />
                    )}

                    {/* Interactive Form Card: Update Order */}
                    {msg.pendingUpdateForm && !msg.pendingUpdateForm.confirmed && !msg.pendingUpdateForm.cancelled && (
                      <AiUpdateOrderCard
                        sales={sales}
                        initialOrderId={msg.pendingUpdateForm.orderId}
                        searchHint={msg.pendingUpdateForm.searchHint}
                        onConfirm={(id, updates) => handleConfirmUpdateForm(msg.id, id, updates)}
                        onCancel={() => handleCancelUpdateForm(msg.id)}
                      />
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
              <div className="flex flex-col items-start space-y-1">
                <div className="max-w-[88%] bg-white dark:bg-[#252528] text-neutral-500 dark:text-neutral-400 rounded-[18px] rounded-bl-[4px] px-4 py-3 border border-black/[0.05] dark:border-white/[0.08] shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-in fade-in duration-150 text-[12.5px] leading-relaxed">
                  <div className="my-1 flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 border-2 border-[#2383e2] border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-[12.5px] font-normal italic leading-relaxed text-neutral-500 dark:text-neutral-400">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Apple Capsule Input Area & Quick Action Pills */}
        <div className="px-3.5 pt-2.5 pb-3 bg-[#f6f6f6]/95 dark:bg-[#202022]/95 border-t border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl">
          <div className={isFullscreen ? 'max-w-3xl mx-auto w-full' : 'w-full'}>
            {/* Suggested Quick Action Chips (Only shown initially before first interaction) */}
            {messages.length <= 1 && !isLoading && (
              <div className="mb-2 relative">
                <div
                  ref={pillsContainerRef}
                  onWheel={handlePillsWheel}
                  className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 no-scrollbar snap-x snap-mandatory scroll-smooth"
                >
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (qp.action === 'create_form') {
                          const ts = Date.now();
                          const userMsg = createUserMessage('I would like to create a new order.');
                          const modelMsg: ChatMessage = {
                            id: `create-form-${ts}`,
                            role: 'model',
                            text: 'Please enter the order details in the form below and confirm:',
                            timestamp: ts + 1,
                            pendingCreateForm: { initialValues: {} },
                          };
                          setMessages((prev) => [...prev, userMsg, modelMsg]);
                        } else if (qp.action === 'update_form') {
                          const ts = Date.now();
                          const userMsg = createUserMessage('I would like to edit an order.');
                          const modelMsg: ChatMessage = {
                            id: `update-form-${ts}`,
                            role: 'model',
                            text: 'Select the order to modify and adjust the fields below, then click confirm to save:',
                            timestamp: ts + 1,
                            pendingUpdateForm: {},
                          };
                          setMessages((prev) => [...prev, userMsg, modelMsg]);
                        } else {
                          handleSendMessage(qp.prompt);
                        }
                      }}
                      className="shrink-0 snap-start whitespace-nowrap px-3 py-1.5 bg-white dark:bg-[#2c2c2e] hover:bg-neutral-100 dark:hover:bg-[#343438] border border-black/[0.06] dark:border-white/[0.08] rounded-full text-[11px] font-medium text-neutral-700 dark:text-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                    >
                      {qp.icon}
                      <span>{qp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative flex items-center bg-white dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.1] rounded-[20px] p-2 focus-within:ring-2 focus-within:ring-[#2383e2]/40 focus-within:border-[#2383e2] transition-all shadow-2xs">
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="w-full bg-transparent border-0 px-2.5 py-1 text-[12.5px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden leading-normal"
              />

              <div className="flex items-center gap-1.5 pb-0.5 pr-0.5">
                {/* Siri Voice Dictation Button */}
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  title={isListening ? 'Listening... click to stop' : 'Voice Dictation'}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                {/* Circular Send Button or Red Stop Button */}
                {isLoading ? (
                  <button
                    type="button"
                    onClick={handleStopExecution}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-[#FF3B30] hover:bg-[#E03126] text-white shadow-xs transition-all cursor-pointer active:scale-90"
                    title="Stop response (Esc)"
                  >
                    <Square className="w-2.5 h-2.5 fill-white text-white" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputQuery.trim()}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${inputQuery.trim()
                      ? 'bg-[#2383e2] hover:bg-[#1a6ebd] text-white shadow-xs active:scale-90'
                      : 'text-neutral-400 dark:text-neutral-600 bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed opacity-40'
                      }`}
                    title="Send Message (Enter)"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 pl-1.5 pr-0 pt-2.5 pb-0.5 font-normal">
              <span>
                <kbd className="px-1 py-0.5 bg-black/[0.04] dark:bg-white/[0.08] rounded font-mono text-[9px] border border-black/[0.04] dark:border-white/[0.06]">Ctrl + J</kbd> to open/close
              </span>

              {/* Desktop Window Resize Grip (Aligned with the red baseline of Ctrl + J hint) */}
              {!isFullscreen && (
                <div
                  onMouseDown={handleResizeMouseDown}
                  className="w-5 h-5 flex items-center justify-end cursor-nwse-resize z-50 group/grip select-none pr-0 translate-y-[5px]"
                  title="Drag to resize window"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 11 11"
                    fill="none"
                    className="text-neutral-400 dark:text-neutral-500 group-hover/grip:text-[#2383e2] transition-colors drop-shadow-2xs"
                  >
                    <path
                      d="M10 2L2 10M10 6L6 10M10 9L9 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
