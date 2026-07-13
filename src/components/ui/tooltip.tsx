"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  wrapperClassName?: string;
  children: React.ReactNode;
}

const GAP = 8;
const EST_HEIGHT = 20;

export function Tooltip({ content, side = "top", wrapperClassName, children }: TooltipProps) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [adjustedSide, setAdjustedSide] = useState(side);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const springConfig = { stiffness: 100, damping: 15 };

  const rotate = useSpring(
    useTransform(x, [-40, 40], [-10, 10]),
    springConfig,
  );
  const translateX = useSpring(
    useTransform(x, [-40, 40], [-20, 20]),
    springConfig,
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - (rect.left + rect.width / 2));
  };

  const handleMouseEnter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const estWidth = Math.min(content.length * 10 + 20, 240);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ecx = rect.left + rect.width / 2;
    const ecy = rect.top + rect.height / 2;
    let finalSide = side;
    let cx: number;
    let cy: number;

    if (side === "top") {
      cx = ecx;
      cy = rect.top - GAP - EST_HEIGHT / 2;
      if (cy - EST_HEIGHT / 2 < GAP) { cy = rect.bottom + GAP + EST_HEIGHT / 2; finalSide = "bottom"; }
    } else if (side === "bottom") {
      cx = ecx;
      cy = rect.bottom + GAP + EST_HEIGHT / 2;
      if (cy + EST_HEIGHT / 2 > vh - GAP) { cy = rect.top - GAP - EST_HEIGHT / 2; finalSide = "top"; }
    } else if (side === "left") {
      cx = rect.left - GAP - estWidth / 2;
      cy = ecy;
      if (cx - estWidth / 2 < GAP) { cx = rect.right + GAP + estWidth / 2; finalSide = "right"; }
    } else {
      cx = rect.right + GAP + estWidth / 2;
      cy = ecy;
      if (cx + estWidth / 2 > vw - GAP) { cx = rect.left - GAP - estWidth / 2; finalSide = "left"; }
    }

    const halfW = estWidth / 2;
    const halfH = EST_HEIGHT / 2;
    cx = Math.max(GAP + halfW, Math.min(vw - GAP - halfW, cx));
    cy = Math.max(GAP + halfH, Math.min(vh - GAP - halfH, cy));

    setPos({ top: cy, left: cx });
    setAdjustedSide(finalSide);
    setHovered(true);
  }, [content, side]);

  const tooltipPortal = (
    <AnimatePresence>
      {hovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            translateX,
            rotate,
            zIndex: 9999,
            pointerEvents: "none" as const,
          }}
        >
          <div style={{ transform: "translate(-50%, -50%)" }}>
            <div className="bg-black/90 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg border border-white/10">
              {content}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div
        ref={containerRef}
        className={cn("inline-flex rounded-full [clip-path:circle(50%)]", wrapperClassName)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
      >
        {children}
      </div>
      {typeof document !== "undefined" ? createPortal(tooltipPortal, document.body) : null}
    </>
  );
}
