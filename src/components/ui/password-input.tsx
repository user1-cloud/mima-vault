import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  wrapperClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, wrapperClassName, ...props }, ref) {
    const [show, setShow] = useState(false);

    return (
      <div className={cn("relative group", wrapperClassName)}>
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn("pr-10", className)}
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Tooltip content={show ? t("hide") : t("show")} side="top">
            <IconButton
              type="button"
              onClick={() => setShow(!show)}
              className="h-7 w-7"
            >
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </IconButton>
          </Tooltip>
        </div>
      </div>
    );
  }
);
