import { motion } from "motion/react";
import { Button, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

export function IconButton({ className, ...props }: ButtonProps) {
  return (
    <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}>
      <Button variant="ghost" size="icon" className={cn("hover:bg-transparent", className)} {...props} />
    </motion.div>
  );
}
