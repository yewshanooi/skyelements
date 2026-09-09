"use client";

import { useEffect } from 'react';

let lockCount = 0;
let scrollY = 0;
let scrollX = 0;

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
 * Robust scroll lock for desktop and mobile browsers (including iOS Safari & WebKit).
 * Sets position: fixed with scroll offset retention on body to prevent underlying viewport scrolling.
 */
export function lockBodyScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (lockCount === 0) {
    // 1. Capture current scroll offsets
    scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;

    // 2. Compute scrollbar width on desktop to prevent layout jitter
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const bodyComputedPaddingRight = window.getComputedStyle(document.body).paddingRight;
    const currentPadding = parseFloat(bodyComputedPaddingRight) || 0;

    // 3. Save original inline styles
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

    // 4. Apply lock styles to HTML root
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    // 5. Apply fixed positioning and lock to document body
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = `-${scrollX}px`;
    document.body.style.right = '0px';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.overscrollBehavior = 'none';

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
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

    // 3. Restore exact scroll position
    window.scrollTo({
      left: scrollX,
      top: scrollY,
      behavior: 'instant' as ScrollBehavior,
    });
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
