import { Globe } from "lucide-react";
import { useLocale } from "@/stores/locale";
import { Button } from "@/components/ui/button";

export function LangSwitcher() {
  const { locale, toggle } = useLocale();

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="text-muted-foreground text-xs gap-1.5">
      <Globe className="w-3.5 h-3.5" />
      {locale === "zh" ? "EN" : "中文"}
    </Button>
  );
}
