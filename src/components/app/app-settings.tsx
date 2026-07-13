import { useState, useEffect, type ReactNode } from "react";
import { Settings, Globe, Palette, Clock } from "lucide-react";
import { useLocale } from "@/stores/locale";
import { useApp } from "@/stores/app";
import { t } from "@/lib/i18n";
import { IconButton } from "@/components/ui/icon-button";
import { Modal, ModalBody, ModalContent } from "@/components/ui/animated-modal";
import { Tooltip } from "@/components/ui/tooltip";
import { LanguageSelector } from "./lang-switcher";

function AutoLockSettings() {
  const { autoLockTimeout, setAutoLockTimeout } = useApp();

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">{t("autoLockDesc")}</p>
      <select
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        value={autoLockTimeout}
        onChange={(e) => setAutoLockTimeout(Number(e.target.value))}
      >
        <option value={0}>{t("autoLockNever")}</option>
        <option value={60}>{t("autoLock1m")}</option>
        <option value={300}>{t("autoLock5m")}</option>
        <option value={900}>{t("autoLock15m")}</option>
        <option value={1800}>{t("autoLock30m")}</option>
        <option value={3600}>{t("autoLock1h")}</option>
      </select>
    </div>
  );
}

interface SettingsTab {
  id: string;
  icon: ReactNode;
  labelKey: string;
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
        <ModalContent className="overflow-hidden">
          <h2 className="text-lg font-semibold mb-4 shrink-0">{t("appSettings")}</h2>

          {/* Content area */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {currentTab?.content}
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-border overflow-x-auto scrollbar-none shrink-0">
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
