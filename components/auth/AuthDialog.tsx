'use client';

import { useEffect } from "react";
import { X } from "lucide-react";
import { AuthCard, type AuthMode } from "./AuthCard";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: AuthMode;
  redirectTo?: string;
}

export function AuthDialog({
  isOpen,
  onClose,
  defaultMode = 'login',
  redirectTo = '/lithium',
}: AuthDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-1.5 text-muted-foreground hover:text-foreground bg-background/80 hover:bg-background rounded-full transition-colors cursor-pointer shadow-xs"
          aria-label="Close"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <AuthCard
          defaultMode={defaultMode}
          redirectTo={redirectTo}
          inDialog
        />
      </div>
    </div>
  );
}
