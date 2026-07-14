import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { replaceTo } from "@/lib/navigation";
import { motion, AnimatePresence, type Variants } from "motion/react";
import {
  Search,
  Plus,
  Copy,
  Check,
  Trash2,
  LogOut,
  ArrowLeft,
  Globe,
  User,
  Key,
  FileText,
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  AlertTriangle,
  Download,
  Upload,
  Timer,
  ArrowUpAZ,
  ArrowDownAZ,
  Clock,
  Tag,
  GripVertical,
} from "lucide-react";

import { WindowControls } from "@/components/app/window-controls";
import { useApp, type Entry } from "@/stores/app";
import type { TotpCode } from "@/stores/app";
import { useLocale } from "@/stores/locale";
import { isDesktop } from "@/lib/platform";
import { t } from "@/lib/i18n";
import { open } from "@tauri-apps/plugin-shell";
import { save, open as openFile } from "@tauri-apps/plugin-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { HighlightIconButton } from "@/components/ui/highlight-icon-button";
import { DangerIconButton } from "@/components/ui/danger-icon-button";
import { StatefulButton } from "@/components/ui/stateful-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { DangerButton } from "@/components/ui/danger-button";
import { useAutoLock } from "./use-auto-lock";

import { Tooltip } from "@/components/ui/tooltip";
import { CardTitle } from "@/components/ui/card-hover-effect";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { Modal, ModalBody, ModalContent } from "@/components/ui/animated-modal";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { EncryptedText } from "@/components/ui/encrypted-text";
import { ListCardIcon, ListCardContent } from "./list-card";
import { SortableCardList, type SortOption } from "./sortable-card-list";

import { useBackLayer } from "@/lib/history-back";
import { Input } from "@/components/ui/input";
import { EntryDialog } from "./entry-dialog";
import { VaultSettingsDialog } from "./vault-settings-dialog";
import { AppSettingsButton } from "./app-settings";

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function avatarColor(name: string): string {
  const colors = [
    "bg-blue-500/20 text-blue-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-violet-500/20 text-violet-400",
    "bg-amber-500/20 text-amber-400",
    "bg-rose-500/20 text-rose-400",
    "bg-cyan-500/20 text-cyan-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const entrySortOptions: SortOption[] = [
  { key: "name-asc", icon: <ArrowUpAZ className="w-4 h-4" />, labelKey: "sortByNameAZ" },
  { key: "name-desc", icon: <ArrowDownAZ className="w-4 h-4" />, labelKey: "sortByNameZA" },
  { key: "created-desc", icon: <Clock className="w-4 h-4" />, labelKey: "sortByDateNewest" },
  { key: "created-asc", icon: <Clock className="w-4 h-4" />, labelKey: "sortByDateOldest" },
  { key: "custom", icon: <GripVertical className="w-4 h-4" />, labelKey: "sortByCustom" },
];

function sortEntries(entries: Entry[], key: string): Entry[] {
  const sorted = [...entries];
  switch (key) {
    case "name-asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "created-desc":
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
      break;
    case "created-asc":
      sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
      break;
    case "custom":
      break;
  }
  return sorted;
}

function entryFilterCategories(entries: Entry[]) {
  const tagCounts = new Map<string, number>();
  for (const e of entries) {
    if (!e.tags) continue;
    for (const tag of e.tags.split(",").map((t) => t.trim()).filter(Boolean)) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(tagCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ key, labelKey: key, count }));
}

const detailVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.15 },
  },
};

const fieldCardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.08 * i, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
};

function DetailBackLayer({ onDeselect, children }: { onDeselect: () => void; children: React.ReactNode }) {
  useBackLayer(true, onDeselect);
  return <>{children}</>;
}

export function Vault() {
  const {
    entries,
    searchQuery,
    selectedId,
    setSearch,
    selectEntry,
    activeVault,
    isLocked,
    closeVault,
    deleteEntry,
    copyToClipboard,
    reorderEntries,
    autoLockTimeout,
    setAutoLockTimeout,
  } = useApp();

  useLocale();

  useEffect(() => {
    if (isLocked || !activeVault) {
      replaceTo("list");
    }
  }, [isLocked, activeVault]);

  useEffect(() => {
    function preventSideButton(e: MouseEvent) {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
      }
    }
    document.addEventListener("mouseup", preventSideButton);
    document.addEventListener("mousedown", preventSideButton);
    return () => {
      document.removeEventListener("mouseup", preventSideButton);
      document.removeEventListener("mousedown", preventSideButton);
    };
  }, []);

  const debouncedSearch = useDebounce(searchQuery, 200);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [entrySortKey, setEntrySortKey] = useState("name-asc");
  const [entryFilters, setEntryFilters] = useState<string[]>([]);

  const sortedEntries = useMemo(
    () => sortEntries(entries, entrySortKey),
    [entries, entrySortKey]
  );

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return sortedEntries;
    const q = debouncedSearch.toLowerCase();
    return sortedEntries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        (e.url && e.url.toLowerCase().includes(q))
    );
  }, [sortedEntries, debouncedSearch]);

  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId]
  );

  const handleClose = useCallback(async () => {
    await closeVault();
    replaceTo("list");
  }, [closeVault]);

  useAutoLock(autoLockTimeout, handleClose);

  const handleCopy = useCallback(
    async (text: string, field: string) => {
      await copyToClipboard(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    },
    [copyToClipboard]
  );

  const handleEdit = useCallback((entry: Entry) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingEntry(null);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteEntry(id);
      setDeleteConfirmId(null);
    },
    [deleteEntry]
  );

  const toggleShow = useCallback((id: number) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleReorder = useCallback(
    (orderedIds: number[]) => {
      const orders: [number, number][] = orderedIds.map((id, i) => [id, i * 1000]);
      setEntrySortKey("custom");
      reorderEntries(orders);
    },
    [reorderEntries]
  );

  return (
    <div className="h-full flex bg-surface relative overflow-hidden">
      {isDesktop() && (
        <div className="absolute top-0 right-0 z-50">
          <WindowControls />
        </div>
      )}
      {/* Sidebar */}
      <div className={`w-full md:w-72 lg:w-80 flex flex-col relative z-10 bg-surface-elevated ${selected ? 'hidden md:flex' : ''}`}>
        {/* Header */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <TextGenerateEffect
                words={activeVault?.name ?? "Mima"}
                className="text-lg font-semibold tracking-tight truncate [&_div]:text-lg [&_div]:mt-0"
              />
              <Tooltip content={t("vaultSettings")} side="bottom">
                <IconButton
                  className="h-7 w-7 shrink-0"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <AppSettingsButton />
              <Tooltip content={t("lockVault")} side="bottom">
                <IconButton onClick={handleClose}>
                    <LogOut className="w-4 h-4" />
                  </IconButton>
              </Tooltip>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-full border-border"
            />
          </div>
        </div>

        {/* Entry list */}
        <div className="flex-1 min-h-0 flex flex-col">
          <SortableCardList
            items={filtered}
            renderItem={(entry, mode) => {
              const sel = entry.id === selectedId;
              if (mode === "compact") {
                return (
                  <button
                    type="button"
                    onClick={() => selectEntry(entry.id)}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-left min-w-0"
                  >
                    <span className="text-sm font-medium truncate">{entry.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{entry.username}</span>
                    {sel && <span className="flex-1" />}
                    {sel && <div className="w-1.5 h-6 rounded-full bg-primary shrink-0" />}
                  </button>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => selectEntry(entry.id)}
                  className="flex-1 flex items-center gap-3 p-3 pl-1 text-left min-w-0"
                >
                  <ListCardIcon className={sel ? "rounded-full bg-primary/20 text-primary ring-2 ring-primary/20" : `rounded-full ${avatarColor(entry.name)}`}>
                    <span className="text-sm font-semibold">
                      {entry.name.charAt(0).toUpperCase()}
                    </span>
                  </ListCardIcon>
                  <ListCardContent name={entry.name} subtitle={entry.username} />
                  {sel && (
                    <motion.div
                      initial={{ scale: 0, height: 0 }}
                      animate={{ scale: 1, height: 32 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="w-1.5 rounded-full bg-primary shrink-0"
                    />
                  )}
                </button>
              );
            }}
            onReorder={handleReorder}
            emptyState={
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  <Key className="w-10 h-10 mb-3 opacity-30" />
                </motion.div>
                <p className="text-sm">
                  {debouncedSearch ? t("noMatches") : t("noEntries")}
                </p>
                {!debouncedSearch && (
                  <StatefulButton
                    variant="link"
                    onClick={handleCreate}
                    className="mt-1 text-primary"
                  >
                    {t("addFirst")}
                  </StatefulButton>
                )}
              </div>
            }
            toolbar={{
              displayMode: true,
              sortOptions: entrySortOptions,
              activeSort: entrySortKey,
              onSortChange: setEntrySortKey,
              getFilterCategories: entryFilterCategories,
              activeFilters: entryFilters,
              onFiltersChange: setEntryFilters,
            }}
          />
        </div>

        {/* Action buttons */}
        <div className="p-3">
          <div className="flex items-center gap-2">
            <Tooltip content={t("newEntry")} side="top">
              <HighlightIconButton onClick={handleCreate}>
                <Plus className="w-4 h-4" />
              </HighlightIconButton>
            </Tooltip>
            <Tooltip content={t("export")} side="bottom">
              <IconButton
                onClick={async () => {
                  const p = await save({
                    defaultPath: `${activeVault?.name ?? "mima"}-export.json`,
                    filters: [{ name: t("jsonFile"), extensions: ["json"] }],
                  });
                  if (p) {
                    try {
                      await useApp.getState().exportPlaintext(p);
                    } catch (_) {}
                  }
                }}
              >
                <Download className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <Tooltip content={t("import")} side="bottom">
              <IconButton
                onClick={async () => {
                  const p = await openFile({
                    filters: [
                      { name: t("jsonFile"), extensions: ["json"] },
                      { name: t("backupFile"), extensions: ["mima-backup"] },
                    ],
                  });
                  if (p) {
                    try {
                      const preview = await useApp.getState().previewImport(p as string);
                      if (preview.entries.length > 0) {
                        await useApp.getState().confirmImport(p as string);
                        await useApp.getState().loadEntries();
                      }
                    } catch (_) {}
                  }
                }}
              >
                <Upload className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Detail pane */}
      <div className={`flex-1 flex flex-col relative z-10 ${selected ? '' : 'hidden md:flex'}`}>
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {selected ? (
              <DetailBackLayer onDeselect={() => selectEntry(null)}>
              <motion.div
                key={selected.id}
                variants={detailVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="p-6 lg:p-10"
              >
                <div className="space-y-6">
                  <div className="md:hidden -mb-3">
                    <Tooltip content={t("back")} side="bottom">
                      <IconButton onClick={() => selectEntry(null)}>
                        <ArrowLeft className="w-4 h-4" />
                      </IconButton>
                    </Tooltip>
                  </div>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                        className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
                      >
                        <span className="text-xl font-bold text-primary">
                          {selected.name.charAt(0).toUpperCase()}
                        </span>
                      </motion.div>
                      <div className="flex flex-col">
                        <EncryptedText
                          text={selected.name}
                          className="text-xl font-semibold"
                        />
                        {selected.url && (
                          <button
                            type="button"
                            onClick={() => {
                              const url = selected.url!;
                              open(/^https?:\/\//i.test(url) ? url : `https://${url}`);
                            }}
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1 transition-colors hover:text-primary/80"
                          >
                            <Globe className="w-3 h-3" />
                            <span className="truncate max-w-[300px]">{selected.url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                    <Tooltip content={t("editEntry")} side="left">
                      <IconButton onClick={() => handleEdit(selected)}>
                        <Pencil className="w-4 h-4" />
                      </IconButton>
                    </Tooltip>
                  </div>

                  {/* Tags */}
                  {selected.tags && (() => {
                    const tagList = selected.tags.split(",").map((t) => t.trim()).filter(Boolean);
                    if (tagList.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {tagList.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-xs text-white"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Fields */}
                  <div className="space-y-3">
                    <FieldCard
                      index={0}
                      icon={<User className="w-4 h-4" />}
                      label={t("username")}
                      value={selected.username}
                      copied={copiedField === `user-${selected.id}`}
                      onCopy={() => handleCopy(selected.username, `user-${selected.id}`)}
                    />
                    <FieldCard
                      index={1}
                      icon={<Key className="w-4 h-4" />}
                      label={t("password")}
                      value={showPassword[selected.id] ? selected.password : t("hidden")}
                      isSecret
                      revealed={showPassword[selected.id]}
                      copied={copiedField === `pass-${selected.id}`}
                      onCopy={() => handleCopy(selected.password, `pass-${selected.id}`)}
                      onToggleReveal={() => toggleShow(selected.id)}
                    />
                    {selected.totp && (
                      <TotpDisplay entryId={selected.id} index={2} />
                    )}
                    {selected.url && (
                      <FieldCard
                        index={3}
                        icon={<Globe className="w-4 h-4" />}
                        label={t("url")}
                        value={selected.url}
                        copied={copiedField === `url-${selected.id}`}
                        onCopy={() => handleCopy(selected.url!, `url-${selected.id}`)}
                      />
                    )}
                    {selected.notes && (
                      <FieldCard
                        index={4}
                        icon={<FileText className="w-4 h-4" />}
                        label={t("notes")}
                        value={selected.notes}
                        multiline
                        copied={copiedField === `notes-${selected.id}`}
                        onCopy={() => handleCopy(selected.notes!, `notes-${selected.id}`)}
                      />
                    )}
                  </div>

                  <div className="h-12" />
                </div>
              </motion.div>
              </DetailBackLayer>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center text-muted-foreground"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ y: [0, -8, 0], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  >
                    <Key className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  </motion.div>
                  <p className="text-sm">{t("selectHint")}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-3 right-3 lg:bottom-10 lg:right-10"
          >
            <Tooltip content={t("deleteEntry")} side="top">
              <DangerIconButton onClick={() => setDeleteConfirmId(selected.id)}>
                <Trash2 className="w-4 h-4" />
              </DangerIconButton>
            </Tooltip>
          </motion.div>
        )}
      </div>

      <EntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editingEntry}
      />

      <VaultSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <Modal open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <ModalBody>
          <ModalContent className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>
            <h2 className="text-lg font-semibold mb-2">{t("confirmDelete")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {(() => {
                const name = entries.find((e) => e.id === deleteConfirmId)?.name ?? "";
                const msg = t("confirmDeleteMessage", { name });
                const idx = msg.indexOf(name);
                if (idx === -1) return msg;
                return (
                  <>
                    {msg.slice(0, idx)}
                    <span className="font-semibold text-primary">{name}</span>
                    {msg.slice(idx + name.length)}
                  </>
                );
              })()}
            </p>
            <div className="flex gap-3 justify-center">
              <SecondaryButton onClick={() => setDeleteConfirmId(null)}>
                {t("cancel")}
              </SecondaryButton>
              <DangerButton
                onClick={() => deleteConfirmId !== null && handleDelete(deleteConfirmId)}
              >
                {t("deleteEntry")}
              </DangerButton>
            </div>
          </ModalContent>
        </ModalBody>
      </Modal>
    </div>
  );
}

function FieldCard({
  index,
  icon,
  label,
  value,
  isSecret,
  revealed,
  multiline,
  copied,
  onCopy,
  onToggleReveal,
}: {
  index: number;
  icon: React.ReactNode;
  label: string;
  value: string;
  isSecret?: boolean;
  revealed?: boolean;
  multiline?: boolean;
  copied: boolean;
  onCopy: () => void;
  onToggleReveal?: () => void;
}) {
  return (
    <motion.div
      custom={index}
      variants={fieldCardVariants}
      initial="hidden"
      animate="visible"
      className="group"
    >
      <CardSpotlight className="p-4 rounded-2xl bg-surface border-white/[0.2]" radius={250}>
        <div className="space-y-2">
          <CardTitle>
            <div className="flex items-center gap-2 -mt-3">
              <span className="text-primary/70">{icon}</span>
              <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                {label}
              </span>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span
              className={`flex-1 text-sm text-white/90 select-text min-w-0 ${
                isSecret && !revealed
                  ? "font-mono tracking-[0.3em]"
                  : multiline
                    ? "whitespace-pre-wrap break-words max-h-48 overflow-y-auto"
                    : "break-all"
              }`}
            >
              {value}
            </span>
            <div className="flex gap-0.5">
              {onToggleReveal && (
                <Tooltip content={revealed ? t("hide") : t("show")} side="top">
                  <IconButton className="h-7 w-7" onClick={onToggleReveal}>
                    {revealed ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip content={copied ? t("copied") : t("copy")} side="top">
                <IconButton className="h-7 w-7" onClick={onCopy}>
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 30 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      >
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      </motion.span>
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </AnimatePresence>
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </div>
      </CardSpotlight>
    </motion.div>
  );
}

function TotpDisplay({ entryId, index }: { entryId: number; index: number }) {
  const { generateTotpCode, copyToClipboard } = useApp();
  const [totp, setTotp] = useState<TotpCode | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let countdownTimer: ReturnType<typeof setInterval>;

    const fetchCode = async () => {
      try {
        const data = await generateTotpCode(entryId);
        if (cancelled) return;
        setTotp(data);
        setError(false);
        setCountdown(data.remaining_seconds);
      } catch {
        if (!cancelled) {
          setTotp(null);
          setError(true);
        }
      }
    };

    fetchCode();

    countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchCode();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(countdownTimer);
    };
  }, [entryId, generateTotpCode]);

  const handleCopy = useCallback(async () => {
    if (!totp) return;
    await copyToClipboard(totp.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [totp, copyToClipboard]);

  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const progress = totp ? countdown / totp.period : 1;

  return (
    <motion.div
      custom={index}
      variants={fieldCardVariants}
      initial="hidden"
      animate="visible"
      className="group"
    >
      <CardSpotlight className="p-4 rounded-2xl bg-surface border-white/[0.2]" radius={250}>
        <div className="space-y-2">
          <CardTitle>
            <div className="flex items-center gap-2 -mt-3">
              <span className="text-primary/70">
                <Timer className="w-4 h-4" />
              </span>
              <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                {t("totp")}
              </span>
            </div>
          </CardTitle>
          <div className="flex items-center gap-3">
            {error ? (
              <span className="text-sm text-muted-foreground">
                {t("totpError")}
              </span>
            ) : !totp ? (
              <span className="text-sm text-muted-foreground animate-pulse">
                {t("totpLoading")}
              </span>
            ) : (
              <>
                <span className="text-2xl font-mono tracking-[0.15em] text-white/90 select-text">
                  {totp.code}
                </span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <svg width="28" height="28" className="shrink-0 -rotate-90">
                    <circle
                      cx="14"
                      cy="14"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-white/10"
                    />
                    <circle
                      cx="14"
                      cy="14"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - progress)}
                      strokeLinecap="round"
                      className={progress < 0.25 ? "text-danger" : "text-primary"}
                    />
                  </svg>
                  <span className="text-xs text-muted-foreground w-5 text-center tabular-nums">
                    {countdown}
                  </span>
                  <Tooltip content={copied ? t("copied") : t("copy")} side="top">
                    <IconButton className="h-7 w-7" onClick={handleCopy}>
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.span
                            key="check"
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 30 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                          >
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          </motion.span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </AnimatePresence>
                    </IconButton>
                  </Tooltip>
                </div>
              </>
            )}
          </div>
        </div>
      </CardSpotlight>
    </motion.div>
  );
}
