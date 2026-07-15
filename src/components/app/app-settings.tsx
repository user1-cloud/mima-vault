import { useState, useEffect, type ReactNode } from "react";
import { Settings, Globe, Palette, Clock, Check } from "lucide-react";
import { useLocale } from "@/stores/locale";
import { useApp } from "@/stores/app";
import { getStoredTheme, setStoredTheme, type Theme } from "@/stores/theme";
import { getStoredAccent, setStoredAccent, ACCENT_PRESETS } from "@/stores/theme-color";
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
                  ? " bg-surface-overlay text-foreground"
                  : " text-muted-foreground hover:bg-surface-overlay hover:text-foreground")
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

const THEME_OPTIONS: { value: Theme; labelKey: string }[] = [
  { value: "system", labelKey: "themeSystem" },
  { value: "dark", labelKey: "themeDark" },
  { value: "light", labelKey: "themeLight" },
];

function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const onSystemChange = () => {
      if (getStoredTheme() === "system") setTheme("system");
    };
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">{t("appearance")}</p>
      <div className="space-y-1">
        {THEME_OPTIONS.map((opt) => {
          const isSelected = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => { setStoredTheme(opt.value); setTheme(opt.value); }}
              className={
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors"
                + (isSelected
                  ? " bg-surface-overlay text-foreground"
                  : " text-muted-foreground hover:bg-surface-overlay hover:text-foreground")
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

function AccentColorPicker() {
  const [accent, setAccent] = useState(getStoredAccent);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">{t("accentColor")}</p>
      <div className="flex items-center gap-2.5">
        {ACCENT_PRESETS.map((preset) => {
          const isSelected = accent === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => { setStoredAccent(preset.id); setAccent(preset.id); }}
              className="relative flex items-center justify-center w-8 h-8 rounded-full transition-transform hover:scale-110"
              style={{ backgroundColor: `oklch(${preset.dark})` }}
              title={t(preset.labelKey)}
            >
              {isSelected && (
                <Check className="w-4 h-4 text-white drop-shadow-sm" strokeWidth={2.5} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <ThemeSelector />
      <AccentColorPicker />
    </div>
  );
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
      content: <AppearanceSettings />,
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
