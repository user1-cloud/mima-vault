import { useEffect } from "react";

type BackHandler = (e: PopStateEvent) => boolean;

const stack: BackHandler[] = [];
export const isHistoryBackConsumed = { current: false };

window.addEventListener('popstate', (e) => {
  if (stack.length > 0) {
    stack[0](e);
  }
});

export function useHistoryBack(handler: BackHandler | null, deps: unknown[]) {
  useEffect(() => {
    if (!handler) return;
    stack.unshift(handler);
    return () => {
      const idx = stack.indexOf(handler);
      if (idx >= 0) stack.splice(idx, 1);
    };
  }, deps);
}
