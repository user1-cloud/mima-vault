import { X } from "lucide-react";
import { IconButton, type IconButtonProps } from "./icon-button";

export function CloseButton({ className, ...props }: IconButtonProps) {
  return (
    <IconButton className={className} {...props}>
      <X className="w-4 h-4" />
    </IconButton>
  );
}
