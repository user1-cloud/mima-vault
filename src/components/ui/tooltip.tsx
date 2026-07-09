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

interface TooltipProps {
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

const GAP = 8;
const EST_HEIGHT = 20;

export function Tooltip({ content, side = "top", children }: TooltipProps) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [adjustedSide, setAdjustedSide] = useState(side);
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

  const handleMouseEnter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const estWidth = Math.min(content.length * 10 + 20, 240);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top: number;
    let left: number;
    let finalSide = side;

    if (side === "top") {
      top = rect.top - EST_HEIGHT - GAP;
      if (top < GAP) { top = rect.bottom + GAP; finalSide = "bottom"; }
    } else if (side === "bottom") {
      top = rect.bottom + GAP;
      if (top + EST_HEIGHT > vh - GAP) { top = rect.top - EST_HEIGHT - GAP; finalSide = "top"; }
    } else {
      top = rect.top + rect.height / 2;
    }

    if (side === "left" || finalSide === "left") {
      left = rect.left - estWidth - GAP;
      if (left < GAP) { left = rect.right + GAP; finalSide = "right"; }
    } else if (side === "right" || finalSide === "right") {
      left = rect.right + GAP;
      if (left + estWidth > vw - GAP) { left = rect.left - estWidth - GAP; finalSide = "left"; }
    } else {
      left = rect.left + rect.width / 2;
      const half = estWidth / 2;
      if (left - half < GAP) {
        left = GAP + half;
      } else if (left + half > vw - GAP) {
        left = vw - GAP - half;
      }
      finalSide = side;
    }

    setPos({ top, left });
    setAdjustedSide(finalSide);
    setHovered(true);
  }, [content, side]);

  const isVertical = adjustedSide === "top" || adjustedSide === "bottom";

  const tooltipPortal = (
    <AnimatePresence>
      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: adjustedSide === "bottom" ? -4 : 4, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: adjustedSide === "bottom" ? -4 : 4, scale: 0.92 }}
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
          <div
            style={isVertical ? { transform: "translateX(-50%)" } : { transform: "translateY(-50%)" }}
          >
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
        className="inline-flex"
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
