import { useEffect, useRef } from "react";

interface BackEntry {
  id: number;
  onBack: () => void;
}

const backStack: BackEntry[] = [];
let isProgrammaticBack = false;
let popstatePoppedId: number | null = null;
let nextId = 1;

const onPopState = () => {
  if (isProgrammaticBack) {
    isProgrammaticBack = false;
    return;
  }
  if (backStack.length === 0) return;
  const top = backStack[backStack.length - 1];
  popstatePoppedId = top.id;
  top.onBack();
};

let listenerInstalled = false;

function ensureListener() {
  if (listenerInstalled) return;
  listenerInstalled = true;
  window.addEventListener("popstate", onPopState, { capture: true });
}

export function useBackLayer(active: boolean, onBack: () => void) {
  const idRef = useRef(0);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const pushedPathRef = useRef("");

  useEffect(() => {
    if (!active) {
      idRef.current = 0;
      return;
    }

    ensureListener();

    const id = nextId++;
    idRef.current = id;
    pushedPathRef.current = window.location.pathname + window.location.search;

    backStack.push({ id, onBack: () => onBackRef.current() });

    window.history.pushState(
      { ...window.history.state, __backLayer: id },
      "",
      window.location.href,
    );

    return () => {
      const idx = backStack.findIndex((e) => e.id === id);
      if (idx === -1) return;

      if (popstatePoppedId === id) {
        popstatePoppedId = null;
        backStack.splice(idx, 1);
        return;
      }

      backStack.splice(idx, 1);

      if (window.location.pathname + window.location.search === pushedPathRef.current) {
        isProgrammaticBack = true;
        window.history.back();
      }
    };
  }, [active]);
}
