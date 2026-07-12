"use client";
import { cn } from "@/lib/utils";
import React from "react";
import { motion } from "motion/react";

const variantStyles = {
  default:
    "bg-primary text-primary-foreground hover:ring-primary",
  secondary:
    "bg-border border border-muted text-white hover:ring-white/10 hover:bg-muted",
  destructive:
    "bg-danger text-danger-foreground hover:ring-danger",
  ghost:
    "hover:bg-surface-elevated hover:text-white hover:ring-primary",
  link: "text-primary underline-offset-4 hover:underline hover:ring-0 hover:ring-offset-0",
} as const;

const sizeStyles = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
} as const;

interface StatefulButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
}

export const StatefulButton = ({
  className,
  children,
  variant = "default",
  size = "default",
  ...rawProps
}: StatefulButtonProps) => {
  const {
    onDrag,
    onDragStart,
    onDragEnd,
    onAnimationStart,
    onAnimationEnd,
    ...props
  } = rawProps;

  return (
    <motion.button
      whileHover={variant === "link" ? undefined : { scale: 1.01 }}
      whileTap={variant === "link" ? undefined : { scale: 0.98 }}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        sizeStyles[size],
        variantStyles[variant],
        variant !== "link" && "hover:ring-2 hover:ring-offset-2 hover:ring-offset-surface",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};
