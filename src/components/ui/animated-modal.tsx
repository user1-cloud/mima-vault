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
import { CloseButton } from "./close-button";
import { Tooltip } from "./tooltip";
import { t } from "@/lib/i18n";

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

  useEffect(() => { context.setOpen(open); }, [open]);
  useEffect(() => {
    if (!context.open && open) onOpenChangeRef.current(false);
  }, [context.open]);

  useEffect(() => {
    if (open) {
      modalOpenCount.current++;
      return () => { modalOpenCount.current = Math.max(0, modalOpenCount.current - 1); };
    }
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
    <div className="absolute top-3 right-3 z-50">
      <Tooltip content={t("close")} side="bottom">
        <CloseButton onClick={() => setOpen(false)} />
      </Tooltip>
    </div>
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
