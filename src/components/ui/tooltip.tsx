"use client";

import { useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

interface TooltipProps {
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

export function Tooltip({ content, side = "top", children }: TooltipProps) {
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const springConfig = { stiffness: 100, damping: 15 };

  const rotate = useSpring(
    useTransform(x, [-50, 50], [-10, 10]),
    springConfig,
  );
  const translateX = useSpring(
    useTransform(x, [-50, 50], [-20, 20]),
    springConfig,
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - (rect.left + rect.width / 2));
  };

  const sideStyles: Record<string, string> = {
    top: "-top-8 left-1/2 -translate-x-1/2",
    bottom: "-bottom-8 left-1/2 -translate-x-1/2",
    left: "top-1/2 -left-2 -translate-x-full -translate-y-1/2",
    right: "top-1/2 -right-2 translate-x-full -translate-y-1/2",
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: side === "bottom" ? -4 : 4, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === "bottom" ? -4 : 4, scale: 0.92 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ translateX, rotate }}
            className={`absolute z-50 ${sideStyles[side]} pointer-events-none`}
          >
            <div className="bg-black/90 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg border border-white/10">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}
