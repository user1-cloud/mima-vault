"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { isHistoryBackConsumed } from "@/lib/history-back";
import { CloseButton } from "./close-button";

interface ModalContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <ModalContext.Provider value={{ open, setOpen }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

export function Modal({ children, open, onOpenChange }: { children: ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <ModalProvider>
      <ModalChild open={open} onOpenChange={onOpenChange}>
        {children}
      </ModalChild>
    </ModalProvider>
  );
};

const modalOpenCount = { current: 0 };
export const isModalOpenRef = { get current() { return modalOpenCount.current > 0; } };

function ModalChild({ children, open, onOpenChange }: { children: ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) {
  const context = useModal();
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const modalIdRef = useRef<string | null>(null);
  const closedByPopstate = useRef(false);

  useEffect(() => { context.setOpen(open); }, [open]);
  useEffect(() => {
    if (!context.open && open) onOpenChangeRef.current(false);
  }, [context.open]);

  // Effect A: push history entry on open. Cleanup calls history.back() when
  // modal closes programmatically (X button / click-outside), so the history
  // entry is removed. When the user pressed back, closedByPopstate is already
  // true and we skip history.back() — the browser already popped the entry.
  useEffect(() => {
    if (!open) {
      console.log('[modal] EffectA: open=false, clearing modalId');
      modalIdRef.current = null;
      return;
    }

    const modalId = crypto.randomUUID();
    modalIdRef.current = modalId;
    modalOpenCount.current++;
    console.log('[modal] EffectA: pushState modalId=', modalId, 'history.length before=', window.history.length);
    window.history.pushState({ __mima_modal: modalId }, '', window.location.href);
    console.log('[modal] EffectA: pushState done, history.length after=', window.history.length);
    closedByPopstate.current = false;

    return () => {
      console.log('[modal] EffectA cleanup: closedByPopstate=', closedByPopstate.current, 'modalId=', modalIdRef.current);
      modalOpenCount.current = Math.max(0, modalOpenCount.current - 1);
      if (!closedByPopstate.current) {
        // Closed via X / click-outside — need to clean up the history entry.
        // Set flag so the capture listener (Effect B) knows this is a
        // programmatic back, then call history.back().
        console.log('[modal] EffectA cleanup: setting isHistoryBackConsumed=true, calling history.back()');
        isHistoryBackConsumed.current = true;
        window.history.back();
        // history.back() fires popstate synchronously.
        // Effect B's capture listener is still registered (Effect B cleanup
        // is empty, so removeEventListener hasn't run yet).
        // The capture listener intercepts the popstate, sees the flag,
        // calls stopImmediatePropagation(), and removes itself.
      } else {
        console.log('[modal] EffectA cleanup: skipping history.back (already closed by popstate)');
      }
    };
  }, [open]);

  // Effect B: capture-phase popstate listener.
  // Declared AFTER Effect A. Cleanup is EMPTY — the listener removes ITSELF
  // inside the callback after intercepting a popstate.
  //
  // Execution order when user presses X to close:
  //   1. EffectA cleanup runs: sets isHistoryBackConsumed=true, calls history.back()
  //   2. history.back() fires popstate SYNCHRONOUSLY
  //   3. Capture listener (still registered) fires: sees flag, calls
  //      stopImmediatePropagation() + removes itself
  //   4. EffectB cleanup runs: empty, listener already removed
  //
  // Execution order when user presses mouse-side-button:
  //   1. Browser fires popstate
  //   2. Capture listener fires: sets closedByPopstate=true, calls
  //      onOpenChange(false), calls stopImmediatePropagation(), removes itself
  //   3. React processes state update: open → false
  //   4. EffectA cleanup: closedByPopstate is true → skip history.back()
  //   5. EffectB cleanup: empty
  useEffect(() => {
    if (!open) return;

    const onPopState = (e: PopStateEvent) => {
      console.log('[modal] EffectB capture: popstate fired, e.state=', JSON.stringify(e.state), 'isHistoryBackConsumed=', isHistoryBackConsumed.current);

      if (isHistoryBackConsumed.current) {
        // Programmatic back from EffectA cleanup.
        console.log('[modal] EffectB capture: programmatic back, consuming flag, stopImmediatePropagation, removing self');
        isHistoryBackConsumed.current = false;
        e.stopImmediatePropagation();
        window.removeEventListener('popstate', onPopState, { capture: true });
        console.log('[modal] EffectB capture: self-removed after programmatic back');
        return;
      }

      // User pressed back / mouse side button.
      console.log('[modal] EffectB capture: user back, closing modal, stopImmediatePropagation, removing self');
      closedByPopstate.current = true;
      onOpenChangeRef.current(false);
      e.stopImmediatePropagation();
      window.removeEventListener('popstate', onPopState, { capture: true });
      console.log('[modal] EffectB capture: self-removed after user back');
    };

    window.addEventListener('popstate', onPopState, { capture: true });
    console.log('[modal] EffectB: capture listener registered');

    // Cleanup is intentionally empty. The listener removes itself inside the
    // callback. If we removed it here, it would be gone before history.back()'s
    // popstate fires (since EffectA cleanup also runs during this cleanup phase).
    return () => {
      console.log('[modal] EffectB cleanup: empty (listener already self-removed or will self-remove)');
    };
  }, [open]);

  return <>{children}</>;
};

export const ModalTrigger = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const { setOpen } = useModal();
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-md text-black dark:text-white text-center relative overflow-hidden",
        className
      )}
      onClick={() => setOpen(true)}
    >
      {children}
    </button>
  );
};

export const ModalBody = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const { open } = useModal();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setShow(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      setShow(false);
    }
  }, [open]);

  const modalRef = useRef<HTMLDivElement>(null!);
  const { setOpen } = useModal();
  useOutsideClick(modalRef, () => setOpen(false));

  return createPortal(
    <AnimatePresence onExitComplete={() => {}}>
      {show && (
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, backdropFilter: "blur(10px)" },
            exit: { opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.25, ease: "easeIn" } },
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "fixed [perspective:800px] [transform-style:preserve-3d] inset-0 h-full w-full flex items-center justify-center z-50",
            !open && "pointer-events-none"
          )}
        >
          <Overlay className={!open ? "pointer-events-none" : ""} />

          <motion.div
            ref={modalRef}
            className={cn(
              "min-h-[50%] max-h-[90%] md:max-w-[40%] bg-surface-elevated border border-border md:rounded-2xl relative z-50 flex flex-col flex-1 overflow-hidden",
              className
            )}
            variants={{
              hidden: { opacity: 0, scale: 0.5, rotateX: 40, y: 40 },
              visible: {
                opacity: 1, scale: 1, rotateX: 0, y: 0,
                transition: { type: "spring", stiffness: 260, damping: 15 },
              },
              exit: {
                opacity: 0, scale: 0.85, rotateX: -15, y: 20,
                transition: { duration: 0.25, ease: "easeIn" },
              },
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <CloseIcon />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const ModalContent = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col flex-1 p-8 md:p-10", className)}>
      {children}
    </div>
  );
};

export const ModalFooter = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "flex justify-end p-4 bg-surface",
        className
      )}
    >
      {children}
    </div>
  );
};

const Overlay = ({ className }: { className?: string }) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
        backdropFilter: "blur(10px)",
      }}
      exit={{
        opacity: 0,
        backdropFilter: "blur(0px)",
      }}
      className={`fixed inset-0 h-full w-full bg-black bg-opacity-50 z-50 ${className}`}
    ></motion.div>
  );
};

const CloseIcon = () => {
  const { setOpen } = useModal();
  return (
    <CloseButton
      onClick={() => setOpen(false)}
      className="absolute top-3 right-3 z-50"
    />
  );
};

// Hook to detect clicks outside of a component.
// Add it in a separate file, I've added here for simplicity
export const useOutsideClick = (
  ref: React.RefObject<HTMLDivElement>,
  callback: Function
) => {
  useEffect(() => {
    const listener = (event: any) => {
      // DO NOTHING if the element being clicked is the target element or their children
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      callback(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, callback]);
};
