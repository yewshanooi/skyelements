"use client";

import type { FC } from 'react';
import { AuthDialog } from '@/components/auth/AuthDialog';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
  redirectTo?: string;
}

export const AuthModal: FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
  redirectTo = '/sales',
}) => {
  return (
    <AuthDialog
      isOpen={isOpen}
      onClose={onClose}
      defaultMode={defaultMode}
      redirectTo={redirectTo}
    />
  );
};
