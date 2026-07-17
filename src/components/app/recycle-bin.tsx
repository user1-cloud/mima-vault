import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Trash2, Archive, FileText, Tag, RotateCcw, AlertTriangle } from "lucide-react";
import { useApp, type RecycleBinItem, type VaultInfo } from "@/stores/app";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { IconButton } from "@/components/ui/icon-button";
import { DangerIconButton } from "@/components/ui/danger-icon-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { DangerButton } from "@/components/ui/danger-button";
import { Modal, ModalBody, ModalContent } from "@/components/ui/animated-modal";
import { Tooltip } from "@/components/ui/tooltip";

interface RecycleBinTab {
  id: string;
  icon: ReactNode;
  labelKey: string;
  load: () => Promise<RecycleBinItem[] | VaultInfo[]>;
  restore: (id: number) => Promise<void>;
  permanentDelete: (id: number) => Promise<void>;
  renderItem: (item: any) => { name: string; subtitle?: string; deletedAt: string };
}

function useRecycleBinTabs(): RecycleBinTab[] {
  const { listDeletedVaults, restoreVault, permanentlyDeleteVault, listRecycleBin, restoreRecycleItem, permanentlyDeleteRecycleItem } = useApp();

  return [
    {
      id: "vaults",
      icon: <Archive className="w-4 h-4" />,
      labelKey: "deletedVaults",
      load: async () => await listDeletedVaults(),
      restore: async (id) => { await restoreVault(id); },
      permanentDelete: async (id) => { await permanentlyDeleteVault(id); },
      renderItem: (v: VaultInfo) => ({
        name: v.name,
        subtitle: undefined,
        deletedAt: v.deleted_at ?? "",
      }),
    },
    {
      id: "entries",
      icon: <FileText className="w-4 h-4" />,
      labelKey: "entries",
      load: async () => {
        const items = await listRecycleBin();
        return items.filter((i) => i.item_type === "entry");
      },
      restore: async (id) => { await restoreRecycleItem(id); },
      permanentDelete: async (id) => { await permanentlyDeleteRecycleItem(id); },
      renderItem: (item: RecycleBinItem) => ({
        name: item.item_name,
        subtitle: undefined,
        deletedAt: item.deleted_at,
      }),
    },
    {
      id: "custom_fields",
      icon: <Tag className="w-4 h-4" />,
      labelKey: "customFields",
      load: async () => {
        const items = await listRecycleBin();
        return items.filter((i) => i.item_type === "custom_field");
      },
      restore: async (id) => { await restoreRecycleItem(id); },
      permanentDelete: async (id) => { await permanentlyDeleteRecycleItem(id); },
      renderItem: (item: RecycleBinItem) => {
        let key = item.item_name;
        let value = "";
        try {
          const cf = JSON.parse(item.item_data);
          key = cf.key ?? item.item_name;
          value = cf.value ?? "";
        } catch { /* use item_name */ }
        return {
          name: key,
          subtitle: value || undefined,
          deletedAt: item.deleted_at,
        };
      },
    },
  ];
}

export function RecycleBinModal({
  open,
  onOpenChange,
  initialTab,
  availableTabs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: string;
  availableTabs?: string[];
}) {
  const allTabs = useRecycleBinTabs();
  const tabs = availableTabs
    ? allTabs.filter((t) => availableTabs.includes(t.id))
    : allTabs;
  const [activeTab, setActiveTab] = useState(initialTab ?? tabs[0]?.id ?? "entries");

  useLocale();

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const currentTab = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [permDeleteId, setPermDeleteId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    if (!currentTab) return;
    setLoading(true);
    try {
      const result = await currentTab.load();
      setItems(result);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentTab]);

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open, activeTab, loadItems]);

  const handleRestore = useCallback(async (id: number) => {
    await currentTab?.restore(id);
    setItems((prev) => prev.filter((i: any) => i.id !== id));
  }, [currentTab]);

  const handlePermDelete = useCallback(async (id: number) => {
    await currentTab?.permanentDelete(id);
    setItems((prev) => prev.filter((i: any) => i.id !== id));
    setPermDeleteId(null);
  }, [currentTab]);

  return (
    <>
      <Modal open={open} onOpenChange={() => { onOpenChange(false); setPermDeleteId(null); }}>
        <ModalBody className="!h-[420px]">
          <ModalContent className="grid grid-rows-[auto_1fr_auto] overflow-hidden !pb-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{t("recycleBin")}</h2>
              {currentTab && (
                <p className="text-sm text-muted-foreground mt-1">{t(currentTab.labelKey)}</p>
              )}
            </div>

            <div className="min-h-0 overflow-y-auto p-1">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("loading")}</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("recycleBinEmpty")}</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item: any) => {
                    const { name, subtitle, deletedAt } = currentTab.renderItem(item);
                    const deletedDate = new Date(deletedAt);
                    const daysLeft = 30 - Math.floor((Date.now() - deletedDate.getTime()) / 86400000);
                    return (
                      <div key={item.id} className="rounded-lg border border-border p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{name}</div>
                          {subtitle && (
                            <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
                          )}
                          <div className="text-xs text-muted-foreground/60">
                            {deletedAt}
                            {daysLeft > 0 && <span className="ml-2">{t("daysRemaining", { n: daysLeft })}</span>}
                          </div>
                        </div>
                        <Tooltip content={t("restore")} side="top">
                          <IconButton className="h-7 w-7" onClick={() => handleRestore(item.id)}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip content={t("permanentlyDelete")} side="top">
                          <DangerIconButton onClick={() => setPermDeleteId(item.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </DangerIconButton>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {tabs.length > 1 && (
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
            )}
          </ModalContent>
        </ModalBody>
      </Modal>

      <Modal open={permDeleteId !== null} onOpenChange={() => setPermDeleteId(null)}>
        <ModalBody>
          <ModalContent className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>
            <h2 className="text-lg font-semibold mb-2">{t("confirmPermanentlyDelete")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("confirmPermanentlyDeleteMessage", {
                name: items.find((i: any) => i.id === permDeleteId)?.name
                  ?? currentTab?.renderItem(items.find((i: any) => i.id === permDeleteId)).name
                  ?? "",
              })}
            </p>
            <div className="flex gap-3 justify-center">
              <SecondaryButton onClick={() => setPermDeleteId(null)}>
                {t("cancel")}
              </SecondaryButton>
              <DangerButton
                onClick={() => permDeleteId !== null && handlePermDelete(permDeleteId)}
              >
                {t("permanentlyDelete")}
              </DangerButton>
            </div>
          </ModalContent>
        </ModalBody>
      </Modal>
    </>
  );
}

export function RecycleBinTabs({
  availableTabs,
}: {
  availableTabs?: string[];
}) {
  const tabs = useRecycleBinTabs();
  const visibleTabs = availableTabs
    ? tabs.filter((t) => availableTabs.includes(t.id))
    : tabs;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string | undefined>();

  return (
    <>
      <div className="flex items-center gap-2">
        {visibleTabs.map((tabItem) => (
          <Tooltip key={tabItem.id} content={t(tabItem.labelKey)} side="top">
            <IconButton
              onClick={() => { setTab(tabItem.id); setOpen(true); }}
            >
              {tabItem.icon}
            </IconButton>
          </Tooltip>
        ))}
      </div>

      <RecycleBinModal
        open={open}
        onOpenChange={setOpen}
        initialTab={tab}
        availableTabs={availableTabs}
      />
    </>
  );
}
