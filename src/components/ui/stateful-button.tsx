"use client";
import { cn } from "@/lib/utils";
import React from "react";
import { motion, useAnimate } from "motion/react";
import { Loader2, Check } from "lucide-react";

interface StatefulButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
}

export const StatefulButton = ({
  className,
  children,
  ...props
}: StatefulButtonProps) => {
  const [scope, animate] = useAnimate();

  const animateLoading = async () => {
    await animate(
      ".loader",
      { width: "20px", scale: 1, display: "block" },
      { duration: 0.2 },
    );
  };

  const animateSuccess = async () => {
    await animate(
      ".loader",
      { width: "0px", scale: 0, display: "none" },
      { duration: 0.2 },
    );
    await animate(
      ".check",
      { width: "20px", scale: 1, display: "block" },
      { duration: 0.2 },
    );
    await animate(
      ".check",
      { width: "0px", scale: 0, display: "none" },
      { delay: 2, duration: 0.2 },
    );
  };

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    await animateLoading();
    try {
      await props.onClick?.(event);
      await animateSuccess();
    } catch {
      await animate(
        ".loader",
        { width: "0px", scale: 0, display: "none" },
        { duration: 0.2 },
      );
    }
  };

  const {
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onAnimationStart,
    onAnimationEnd,
    ...buttonProps
  } = props;

  return (
    <motion.button
      layout
      ref={scope}
      className={cn(
        "flex min-w-[120px] cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground ring-offset-2 transition duration-200 hover:ring-2 hover:ring-primary dark:ring-offset-black",
        className,
      )}
      {...buttonProps}
      onClick={handleClick}
    >
      <motion.div layout className="flex items-center justify-center gap-2">
        <Loader2 className="loader w-5 h-5 animate-spin text-primary-foreground hidden" />
        <Check className="check w-5 h-5 text-primary-foreground hidden" />
        <motion.span layout>{children}</motion.span>
      </motion.div>
    </motion.button>
  );
};
