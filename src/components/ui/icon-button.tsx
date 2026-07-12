import { motion, type HTMLMotionProps } from "motion/react";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";

export function IconButton({ className, children, ...props }: HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hover:bg-transparent", className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
