"use client";

import { useEffect } from 'react';
import type { RefObject } from 'react';

/** Distance (px) from the top/bottom edge of the scroll area where auto-scroll kicks in. */
const EDGE = 120;
/** Max scroll speed in px per frame. */
const MAX_SPEED = 24;

/** Nearest ancestor that scrolls vertically, or null when the window scrolls. */
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node && node !== document.body && node !== document.documentElement) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * While `active` is true (a drag is in progress), scrolls the nearest scrollable ancestor of
 * `anchorRef` (or the window) when the pointer nears its top/bottom edge. This lets users drag
 * items to targets that are currently out of view.
 */
export function useDragAutoScroll(active: boolean, anchorRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;

    const scroller = getScrollParent(anchorRef.current);
    let pointerY: number | null = null;
    let frame = 0;

    const onDragOver = (e: DragEvent) => {
      pointerY = e.clientY;
    };

    const tick = () => {
      if (pointerY !== null) {
        const bounds = scroller
          ? scroller.getBoundingClientRect()
          : { top: 0, bottom: window.innerHeight };
        let delta = 0;
        if (pointerY < bounds.top + EDGE) {
          delta = -Math.min(1, (bounds.top + EDGE - pointerY) / EDGE);
        } else if (pointerY > bounds.bottom - EDGE) {
          delta = Math.min(1, (pointerY - (bounds.bottom - EDGE)) / EDGE);
        }
        if (delta !== 0) {
          // Always move at least 3px so the scroll never stalls at the edge of the zone.
          const amount = Math.sign(delta) * Math.max(3, Math.round(Math.abs(delta) * MAX_SPEED));
          if (scroller) scroller.scrollTop += amount;
          else window.scrollBy(0, amount);
        }
      }
      frame = requestAnimationFrame(tick);
    };

    document.addEventListener('dragover', onDragOver);
    frame = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener('dragover', onDragOver);
      cancelAnimationFrame(frame);
    };
  }, [active, anchorRef]);
}
