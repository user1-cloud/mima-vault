import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

function MinimizeIcon() {
  return (
    <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
      <path d="M0 0h10v1H0z" fill="currentColor" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <rect x="0.5" y="0.5" width="9" height="9" rx="1" stroke="currentColor" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="10" height="11" viewBox="0 0 10 11" fill="none">
      <rect x="1.5" y="1.5" width="7" height="7" rx="1" stroke="currentColor" />
      <path d="M1 4V8.5A1.5 1.5 0 0 0 2.5 10H7" stroke="currentColor" fill="none" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

const btnBase =
  "flex items-center justify-center w-[46px] h-8 cursor-default transition-colors";

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const w = getCurrentWindow();
    w.isMaximized().then(setMaximized);
    w.onResized(() => {
      w.isMaximized().then(setMaximized);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const minimize = useCallback(() => getCurrentWindow().minimize(), []);
  const toggleMaximize = useCallback(() => getCurrentWindow().toggleMaximize(), []);
  const close = useCallback(() => getCurrentWindow().close(), []);

  return (
    <div className="flex h-8" data-tauri-drag-region="false">
      <button
        onClick={minimize}
        className={`${btnBase} text-white/60 hover:bg-white/10 hover:text-white`}
      >
        <MinimizeIcon />
      </button>
      <button
        onClick={toggleMaximize}
        className={`${btnBase} text-white/60 hover:bg-white/10 hover:text-white`}
      >
        {maximized ? <RestoreIcon /> : <MaximizeIcon />}
      </button>
      <button
        onClick={close}
        className={`${btnBase} text-white/60 hover:bg-[#c42b1c] hover:text-white`}
      >
        <CloseIcon />
      </button>
    </div>
  );
}
