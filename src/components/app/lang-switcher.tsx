import { useState, useMemo, useEffect } from "react";
import { Globe, Check, Search } from "lucide-react";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";

export function LangSwitcher() {
  const { locale, locales, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [previousLocale, setPreviousLocale] = useState(locale);
  const [query, setQuery] = useState("");

  if (locales.length <= 1) return null;

  const filtered = useMemo(() => {
    if (!query.trim()) return locales;
    const q = query.toLowerCase();
    return locales.filter(
      (l) =>
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [locales, query]);

  useEffect(() => {
    if (!open) return;
    const prev = previousLocale;
    window.history.pushState({ __mimaLang: true }, "", window.location.href);
    const pop = () => {
      setLocale(prev);
      setOpen(false);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [open]);

  const handleOpen = () => {
    setPreviousLocale(locale);
    setQuery("");
    setOpen(true);
  };

  const handleSelect = (code: string) => {
    setLocale(code);
  };

  const handleCancel = () => {
    setLocale(previousLocale);
    setOpen(false);
  };

  return (
    <>
      <Tooltip content={t("language")} side="bottom">
        <Button variant="ghost" size="icon" onClick={handleOpen}>
          <Globe className="w-4 h-4" />
        </Button>
      </Tooltip>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("language")}</DialogTitle>
            <DialogDescription>
              {t("selectLanguage")}
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder={t("searchLanguage")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="relative">
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("noMatches")}
                </p>
              ) : (
                filtered.map((l) => {
                  const isSelected = locale === l.code;
                  return (
                    <button
                      key={l.code}
                      onClick={() => handleSelect(l.code)}
                      className={
                        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors"
                        + (isSelected
                          ? " bg-white/10 text-white"
                          : " text-white/70 hover:bg-white/5 hover:text-white/90")
                      }
                    >
                      <span className="flex-1 text-left">{l.nativeName}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-surface-elevated to-transparent" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              {t("cancel")}
            </Button>
            <Button onClick={() => setOpen(false)}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
