import { motion } from "motion/react";

interface ListCardProps {
  children: React.ReactNode;
  className?: string;
}

export function ListCard({ children, className }: ListCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`rounded-xl flex items-stretch overflow-hidden bg-surface-elevated hover:bg-surface-overlay ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

interface ListCardIconProps {
  children: React.ReactNode;
  className?: string;
}

export function ListCardIcon({ children, className }: ListCardIconProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

interface ListCardContentProps {
  name: string;
  subtitle: string;
}

export function ListCardContent({ name, subtitle }: ListCardContentProps) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium truncate">{name}</p>
      <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
    </div>
  );
}

