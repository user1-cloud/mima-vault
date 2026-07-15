import { motion } from "motion/react";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListCard } from "./list-card";

interface SortableCardItemProps {
  id: number;
  children: React.ReactNode;
  className?: string;
  hideHandle?: boolean;
}

export function SortableCardItem({ id, children, className, hideHandle }: SortableCardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="px-2 py-0.5">
      <ListCard className={className}>
        {!hideHandle && (
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-9 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground transition-colors touch-none"
          >
            <GripVertical className="w-5 h-5" />
          </div>
        )}
        {children}
      </ListCard>
    </div>
  );
}
