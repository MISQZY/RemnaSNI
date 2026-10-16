"use client";

import { useEffect, type RefObject } from "react";

/**
 * Keeps a long press on `ref` a press: no text selection, magnifier, callout or double-tap zoom on phones, which a
 * press held for seconds (a fish reeled in) would otherwise bring up. Only a native listener can cancel a touch:
 * React's are passive.
 */
export function useHoldSurface(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchstart", stop, { passive: false });
    el.addEventListener("contextmenu", stop);
    el.addEventListener("selectstart", stop);
    return () => {
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("contextmenu", stop);
      el.removeEventListener("selectstart", stop);
    };
  }, [ref]);
}
