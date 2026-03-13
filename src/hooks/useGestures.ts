/**
 * Gesture Support Hook
 * Provides touch gesture support for mobile interactions
 */
import { useCallback, useRef, useEffect } from 'react';

export interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPullDown?: () => void;
  onPinch?: (scale: number) => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

export interface GestureOptions {
  swipeThreshold?: number;
  pullThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  preventScroll?: boolean;
}

export const useGestures = (
  handlers: GestureHandlers,
  options: GestureOptions = {}
) => {
  const {
    swipeThreshold = 50,
    pullThreshold = 100,
    longPressDelay = 500,
    doubleTapDelay = 300,
    preventScroll = false
  } = options;

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchMove = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    touchMove.current = null;

    // Start long press timer
    if (handlers.onLongPress) {
      longPressTimer.current = setTimeout(() => {
        handlers.onLongPress?.();
      }, longPressDelay);
    }

    if (preventScroll) {
      e.preventDefault();
    }
  }, [handlers, longPressDelay, preventScroll]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchMove.current = {
      x: touch.clientX,
      y: touch.clientY
    };

    // Cancel long press if moved
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (preventScroll) {
      e.preventDefault();
    }
  }, [preventScroll]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!touchStart.current) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const deltaX = endX - touchStart.current.x;
    const deltaY = endY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Check for tap
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 200) {
      const now = Date.now();
      
      // Check for double tap
      if (now - lastTap.current < doubleTapDelay && handlers.onDoubleTap) {
        handlers.onDoubleTap();
        lastTap.current = 0; // Reset to prevent triple tap
      } else {
        lastTap.current = now;
        // Delay single tap to wait for potential double tap
        setTimeout(() => {
          if (lastTap.current === now) {
            handlers.onTap?.();
          }
        }, doubleTapDelay);
      }
      return;
    }

    // Check for swipes
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > swipeThreshold || absY > swipeThreshold) {
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          // Check for pull down
          if (deltaY > pullThreshold && touchStart.current.y < 100) {
            handlers.onPullDown?.();
          } else {
            handlers.onSwipeDown?.();
          }
        } else {
          handlers.onSwipeUp?.();
        }
      }
    }

    touchStart.current = null;
    touchMove.current = null;

    if (preventScroll) {
      e.preventDefault();
    }
  }, [
    swipeThreshold,
    pullThreshold,
    doubleTapDelay,
    preventScroll,
    handlers
  ]);

  // Pinch gesture handling
  const handlePinch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && handlers.onPinch) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      // This is a simplified pinch detection
      // In a real implementation, you'd track the initial distance
      // and calculate the scale factor
      handlers.onPinch(distance / 100);
    }
  }, [handlers]);

  // Return event handlers for the element
  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    ...(handlers.onPinch && { onTouchMove: handlePinch }),
  };
};