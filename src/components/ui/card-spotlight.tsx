"use client";

import { useMotionValue, motion, useMotionTemplate } from "motion/react";
import React, { MouseEvent as ReactMouseEvent, useState, useEffect, useRef, useCallback } from "react";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import { cn } from "@/lib/utils";

let globalMouseX = 0;
let globalMouseY = 0;
let trackerInstalled = false;

function installGlobalTracker() {
  if (trackerInstalled) return;
  trackerInstalled = true;
  document.addEventListener("mousemove", (e) => {
    globalMouseX = e.clientX;
    globalMouseY = e.clientY;
  });
}

export const CardSpotlight = ({
  children,
  radius = 350,
  color = "#262626",
  className,
  ...props
}: {
  radius?: number;
  color?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const updateMousePosition = useCallback(
    (currentTarget: HTMLDivElement, clientX: number, clientY: number) => {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    },
    [mouseX, mouseY],
  );

  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    installGlobalTracker();
    const el = containerRef.current;
    if (!el) return;

    const handleDocMouseOver = (e: MouseEvent) => {
      const target = e.target as Node;
      if (el.contains(target)) {
        updateMousePosition(el, e.clientX, e.clientY);
        setIsHovering(true);
      }
    };
    document.addEventListener("mouseover", handleDocMouseOver);

    if (el.matches(":hover")) {
      updateMousePosition(el, globalMouseX, globalMouseY);
      setIsHovering(true);
    }

    return () => {
      document.removeEventListener("mouseover", handleDocMouseOver);
    };
  }, [updateMousePosition]);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: ReactMouseEvent<HTMLDivElement>) {
    updateMousePosition(currentTarget, clientX, clientY);
  }

  const handleMouseEnter = (e: ReactMouseEvent<HTMLDivElement>) => {
    updateMousePosition(e.currentTarget, e.clientX, e.clientY);
    setIsHovering(true);
  };
  const handleMouseLeave = () => setIsHovering(false);

  return (
    <div
      ref={containerRef}
      className={cn("group/spotlight relative", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: "inherit" }}>
        <motion.div
          className="pointer-events-none absolute z-0 -inset-px rounded-md opacity-0 transition duration-300 group-hover/spotlight:opacity-100"
          style={{
            backgroundColor: color,
            maskImage: useMotionTemplate`
              radial-gradient(
                ${radius}px circle at ${mouseX}px ${mouseY}px,
                white,
                transparent 80%
              )
            `,
          }}
        >
          {isHovering && (
            <CanvasRevealEffect
              animationSpeed={3}
              containerClassName="bg-transparent absolute inset-0 pointer-events-none"
              colors={[
                [59, 130, 246],
                [139, 92, 246],
              ]}
              dotSize={3}
            />
          )}
        </motion.div>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
};
