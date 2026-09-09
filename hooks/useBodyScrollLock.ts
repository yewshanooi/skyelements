"use client";

import { useEffect } from 'react';

let lockCount = 0;

let originalBodyStyles = {
  overflow: '',
  position: '',
  top: '',
  left: '',
  right: '',
  width: '',
  height: '',
  paddingRight: '',
  overscrollBehavior: '',
};

let originalHtmlStyles = {
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
    // 1. Save original inline styles
    originalBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      height: document.body.style.height,
      paddingRight: document.body.style.paddingRight,
      overscrollBehavior: document.body.style.overscrollBehavior,
    };
    originalHtmlStyles = {
      overflow: document.documentElement.style.overflow,
      overscrollBehavior: document.documentElement.style.overscrollBehavior,
    };

    // 2. Apply lock styles to HTML root and document body
    // Do NOT inject scrollbarWidth into paddingRight because scrollbar-gutter: stable already preserves the gutter.
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
  }

  lockCount++;
}

export function unlockBodyScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);

  if (lockCount === 0) {
    // 1. Restore HTML root inline styles
    document.documentElement.style.overflow = originalHtmlStyles.overflow;
    document.documentElement.style.overscrollBehavior = originalHtmlStyles.overscrollBehavior;

    // 2. Restore document body inline styles
    document.body.style.overflow = originalBodyStyles.overflow;
    document.body.style.position = originalBodyStyles.position;
    document.body.style.top = originalBodyStyles.top;
    document.body.style.left = originalBodyStyles.left;
    document.body.style.right = originalBodyStyles.right;
    document.body.style.width = originalBodyStyles.width;
    document.body.style.height = originalBodyStyles.height;
    document.body.style.paddingRight = originalBodyStyles.paddingRight;
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
