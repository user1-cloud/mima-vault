import { useState, useEffect, type ReactNode } from "react";
import { Settings, Globe, Palette, Clock, Check } from "lucide-react";
import { useLocale } from "@/stores/locale";
import { useApp } from "@/stores/app";
import { t } from "@/lib/i18n";
import { IconButton } from "@/components/ui/icon-button";
import { Modal, ModalBody, ModalContent } from "@/components/ui/animated-modal";
import { Tooltip } from "@/components/ui/tooltip";
import { LanguageSelector } from "./lang-switcher";

const AUTO_LOCK_OPTIONS = [
  { value: 0, labelKey: "autoLockNever" },
  { value: 60, labelKey: "autoLock1m" },
  { value: 300, labelKey: "autoLock5m" },
  { value: 900, labelKey: "autoLock15m" },
  { value: 1800, labelKey: "autoLock30m" },
  { value: 3600, labelKey: "autoLock1h" },
] as const;

function AutoLockSettings() {
  const { autoLockTimeout, setAutoLockTimeout } = useApp();

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">{t("autoLockDesc")}</p>
      <div className="space-y-1">
        {AUTO_LOCK_OPTIONS.map((opt) => {
          const isSelected = autoLockTimeout === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setAutoLockTimeout(opt.value)}
              className={
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors"
                + (isSelected
                  ? " bg-surface-overlay text-white"
                  : " text-muted-foreground hover:bg-surface-overlay hover:text-white")
              }
            >
              <span className="flex-1 text-left">{t(opt.labelKey)}</span>
              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SettingsTab {
  id: string;
  icon: ReactNode;
  labelKey: string;
  subtitleKey?: string;
  content: ReactNode;
}

function useSettingsTabs(): SettingsTab[] {
  return [
    {
      id: "language",
      icon: <Globe className="w-4 h-4" />,
      labelKey: "language",
      content: <LanguageSelector />,
    },
    {
      id: "appearance",
      icon: <Palette className="w-4 h-4" />,
      labelKey: "appearance",
      content: (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {t("comingSoon")}
        </p>
      ),
    },
    {
      id: "autoLock",
      icon: <Clock className="w-4 h-4" />,
      labelKey: "autoLock",
      content: <AutoLockSettings />,
    },
  ];
}

export function AppSettingsModal({
  open,
  onOpenChange,
  initialTab,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: string;
}) {
  const tabs = useSettingsTabs();
  const [activeTab, setActiveTab] = useState(initialTab ?? tabs[0]?.id ?? "language");

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const currentTab = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalBody className="!h-[420px]">
        <ModalContent className="grid grid-rows-[auto_1fr_auto] overflow-hidden !pb-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{t(currentTab.labelKey)}</h2>
            {currentTab.subtitleKey && (
              <p className="text-sm text-muted-foreground mt-1">{t(currentTab.subtitleKey)}</p>
            )}
          </div>

          {/* Content area */}
          <div className="min-h-0 overflow-y-auto p-1">
            {currentTab?.content}
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-border overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <Tooltip key={tab.id} content={t(tab.labelKey)} side="top">
                <IconButton
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                </IconButton>
              </Tooltip>
            ))}
          </div>
        </ModalContent>
      </ModalBody>
    </Modal>
  );
}

export function AppSettingsButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip content={t("appSettings")} side="bottom">
        <IconButton className={className} onClick={() => setOpen(true)}>
          <Settings className="w-4 h-4" />
        </IconButton>
      </Tooltip>

      <AppSettingsModal open={open} onOpenChange={setOpen} />
    </>
  );
}

export function AppSettingsTabs({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string | undefined>();
  const tabs = useSettingsTabs();

  return (
    <>
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        {tabs.map((tabItem) => (
          <Tooltip key={tabItem.id} content={t(tabItem.labelKey)} side="top">
            <IconButton
              onClick={() => { setTab(tabItem.id); setOpen(true); }}
            >
              {tabItem.icon}
            </IconButton>
          </Tooltip>
        ))}
      </div>

      <AppSettingsModal
        open={open}
        onOpenChange={setOpen}
        initialTab={tab}
      />
    </>
  );
}
