import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

interface DropdownMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function DropdownMenu({
  open,
  onOpenChange,
  trigger,
  children,
  align = "right",
  className,
}: DropdownMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  return (
    <div ref={containerRef} className="relative">
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full mt-1 z-50 w-44 rounded-lg bg-surface-elevated border border-border shadow-xl p-1 ${
              align === "right" ? "right-0" : "left-0"
            } ${className ?? ""}`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DropdownMenuItemProps {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}

export function DropdownMenuItem({ onClick, active, children }: DropdownMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors"
        + (active
          ? " bg-surface-overlay text-white"
          : " text-muted-foreground hover:bg-surface-overlay hover:text-white")
      }
    >
      {children}
    </button>
  );
}
