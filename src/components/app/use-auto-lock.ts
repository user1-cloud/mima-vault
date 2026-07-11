import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export function useAutoLock(timeout: number, onLock: () => void) {
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  useEffect(() => {
    if (timeout <= 0) return;

    const interval = setInterval(async () => {
      try {
        const { seconds } = await invoke<{ seconds: number }>(
          "plugin:idlemonitor|get_idle_time"
        );
        if (seconds >= timeout) {
          onLockRef.current();
        }
      } catch {
        // plugin call may fail, ignore
      }
    }, 5000);

    let unlisten: (() => void) | undefined;
    listen<{ locked: boolean }>("system:lock", (e) => {
      if (e.payload.locked) {
        onLockRef.current();
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      clearInterval(interval);
      unlisten?.();
    };
  }, [timeout]);
}
