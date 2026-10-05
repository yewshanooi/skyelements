"use client";

import { useEffect } from 'react';

let lockCount = 0;

let originalBodyStyles = {
  overflow: '',
  overscrollBehavior: '',
};

/**
 * Robust scroll lock for desktop and mobile browsers.
 * With `scrollbar-gutter: stable` defined on the root, the scrollbar channel remains stable
 * without injecting artificial paddingRight (which creates a blank vertical space).
 */
export function lockBodyScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (lockCount === 0) {
    originalBodyStyles = {
      overflow: document.body.style.overflow,
      overscrollBehavior: document.body.style.overscrollBehavior,
    };

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
  }

  lockCount++;
}

export function unlockBodyScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);

  if (lockCount === 0) {
    document.body.style.overflow = originalBodyStyles.overflow;
    document.body.style.overscrollBehavior = originalBodyStyles.overscrollBehavior;
  }
}

/**
 * Hook to lock vertical scrolling on document body when modals or dialogs are open
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}
