import { useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";

type View = "list" | "vault";

let currentView: View = "list";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function init() {
  if (history.state?.view) {
    currentView = history.state.view;
  } else {
    history.replaceState({ view: "list" }, "", "/");
  }
}

init();

function onPopState() {
  const view = history.state?.view;
  if (view && view !== currentView) {
    currentView = view;
    notify();
  }
}

window.addEventListener("popstate", onPopState);

export function getView() {
  return currentView;
}

export function navigateTo(view: View) {
  if (view === currentView) return;
  currentView = view;
  const url = view === "list" ? "/" : "/vault";
  history.pushState({ view }, "", url);
  notify();
}

export function navigateToWithTransition(view: View) {
  if (view === currentView) return;
  if ("startViewTransition" in document) {
    document.startViewTransition(() => {
      flushSync(() => {
        currentView = view;
        const url = view === "list" ? "/" : "/vault";
        history.pushState({ view }, "", url);
        notify();
      });
    });
  } else {
    navigateTo(view);
  }
}

export function replaceTo(view: View) {
  if (view === currentView) return;
  currentView = view;
  const url = view === "list" ? "/" : "/vault";
  history.replaceState({ view }, "", url);
  notify();
}

export function useView() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return currentView;
}
