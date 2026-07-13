import { motion, type HTMLMotionProps } from "motion/react";
import { buttonVariants } from "./button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

interface IconButtonProps extends HTMLMotionProps<"button"> {
  variant?: VariantProps<typeof buttonVariants>["variant"];
}

export function IconButton({ className, children, variant = "ghost", ...props }: IconButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      className={cn(
        buttonVariants({ variant, size: "icon" }),
        "h-8 w-8 rounded-full [clip-path:circle(50%)]",
        variant === "ghost" && "hover:bg-transparent",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
