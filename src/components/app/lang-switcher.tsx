import { useState, useMemo } from "react";
import { Globe, Check, Search } from "lucide-react";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalContent } from "@/components/ui/animated-modal";
import { Tooltip } from "@/components/ui/tooltip";

export function LanguageSelector() {
  const { locale, locales, setLocale } = useLocale();
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

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8 h-8 text-sm focus-visible:ring-offset-1"
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
                  onClick={() => setLocale(l.code)}
                  className={
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors"
                    + (isSelected
                      ? " bg-surface-overlay text-foreground"
                      : " text-muted-foreground hover:bg-surface-overlay hover:text-foreground")
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
    </div>
  );
}

export function LangSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [previousLocale, setPreviousLocale] = useState(locale);

  const { locales } = useLocale();
  if (locales.length <= 1) return null;

  const handleCancel = () => {
    setLocale(previousLocale);
    setOpen(false);
  };

  const handleOpen = () => {
    setPreviousLocale(useLocale.getState().locale);
    setOpen(true);
  };

  const handleClose = () => {
    setLocale(previousLocale);
    setOpen(false);
  };

  return (
    <>
      <Tooltip content={t("language")} side="bottom">
        <IconButton onClick={handleOpen}>
          <Globe className="w-4 h-4" />
        </IconButton>
      </Tooltip>

      <Modal open={open} onOpenChange={handleClose}>
        <ModalBody>
          <ModalContent>
            <h2 className="text-lg font-semibold mb-2">{t("language")}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t("selectLanguage")}</p>

            <LanguageSelector />

            <div className="flex gap-3 justify-end pt-2">
              <SecondaryButton onClick={handleCancel}>
                {t("cancel")}
              </SecondaryButton>
              <PrimaryButton onClick={() => setOpen(false)}>
                {t("save")}
              </PrimaryButton>
            </div>
          </ModalContent>
        </ModalBody>
      </Modal>
    </>
  );
}
