import { Globe } from "lucide-react";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

export function LangSwitcher() {
  const { toggle } = useLocale();

  return (
    <Tooltip content={t("language")} side="bottom">
      <Button variant="ghost" size="icon" onClick={toggle}>
        <Globe className="w-4 h-4" />
      </Button>
    </Tooltip>
  );
}
