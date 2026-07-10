import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Settings,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useApp, type Entry } from "@/stores/app";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { open } from "@tauri-apps/plugin-shell";
import { save, open as openFile } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { StatefulButton } from "@/components/ui/stateful-button";

import { Tooltip } from "@/components/ui/tooltip";
import { CardTitle } from "@/components/ui/card-hover-effect";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { EncryptedText } from "@/components/ui/encrypted-text";

import { Input } from "@/components/ui/input";
import { EntryDialog } from "./entry-dialog";
import { LangSwitcher } from "./lang-switcher";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function SortableEntryItem({
  entry,
  isSelected,
  onSelect,
}: {
  entry: Entry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left p-3 border-b border-border/50 transition-colors group relative ${
          isSelected
            ? "bg-primary/10 border-l-2 border-l-primary"
            : "border-l-2 border-l-transparent"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isSelected
                ? "bg-primary/20 text-primary"
                : "bg-accent text-muted-foreground"
            }`}
          >
            <span className="text-xs font-semibold">
              {entry.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{entry.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {entry.username}
            </p>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </button>
    </div>
  );
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

export function Vault() {
  const navigate = useNavigate();
  const {
    entries,
    searchQuery,
    selectedId,
    setSearch,
    selectEntry,
    activeVault,
    closeVault,
    deleteEntry,
    copyToClipboard,
    renameVault,
    reorderEntries,
  } = useApp();

  useLocale();

  const debouncedSearch = useDebounce(searchQuery, 200);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vaultNameInput, setVaultNameInput] = useState("");

  const [items, setItems] = useState<Entry[]>(entries);
  useEffect(() => {
    setItems(entries);
  }, [entries]);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return items;
    const q = debouncedSearch.toLowerCase();
    return items.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        (e.url && e.url.toLowerCase().includes(q))
    );
  }, [items, debouncedSearch]);

  const selected = useMemo(
    () => items.find((e) => e.id === selectedId) ?? null,
    [items, selectedId]
  );

  const handleClose = useCallback(async () => {
    await closeVault();
    navigate("/");
  }, [closeVault, navigate]);

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

  const handleOpenSettings = useCallback(() => {
    setVaultNameInput(activeVault?.name ?? "");
    setSettingsOpen(true);
  }, [activeVault]);

  const handleSaveSettings = useCallback(async () => {
    if (!activeVault || !vaultNameInput.trim()) return;
    await renameVault(activeVault.id, vaultNameInput.trim());
    setSettingsOpen(false);
  }, [activeVault, vaultNameInput, renameVault]);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((e) => e.id === active.id);
      const newIdx = prev.findIndex((e) => e.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const orders: [number, number][] = items.map((e, i) => [e.id, i * 1000]);
      reorderEntries(orders);
    },
    [items, reorderEntries]
  );

  const pushedDetailRef = useRef<number | null>(null);
  const dialogOpenRef = useRef(false);
  dialogOpenRef.current = dialogOpen || settingsOpen;

  useEffect(() => {
    if (!selected) {
      pushedDetailRef.current = null;
      return;
    }

    if (pushedDetailRef.current === selected.id) return;
    pushedDetailRef.current = selected.id;

    window.history.pushState({ __mimaDetail: selected.id }, '', window.location.href);

    const handlePopState = () => {
      if (dialogOpenRef.current) return;
      const { selectedId: currentId } = useApp.getState();
      if (currentId !== null) {
        selectEntry(null);
        pushedDetailRef.current = null;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selected?.id]);

  useEffect(() => {
    if (!dialogOpen) return;

    window.history.pushState({ __mimaDialog: true }, '', window.location.href);

    const handlePopState = () => {
      setDialogOpen(false);
      setEditingEntry(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dialogOpen]);

  useEffect(() => {
    if (!settingsOpen) return;

    window.history.pushState({ __mimaSettings: true }, '', window.location.href);

    const handlePopState = () => {
      setSettingsOpen(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [settingsOpen]);

  return (
    <div className="h-full flex bg-surface relative overflow-hidden">
      <DottedGlowBackground
        gap={16}
        radius={1.5}
        color="rgba(255,255,255,0.4)"
        glowColor="rgba(50, 117, 248, 0.5)"
        opacity={0.4}
        speedScale={0.4}
      />
      {/* Sidebar */}
      <div className={`w-full md:w-72 lg:w-80 border-r border-border flex flex-col bg-surface-elevated relative z-10 ${selected ? 'hidden md:flex' : ''}`}>
        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <TextGenerateEffect
                words={activeVault?.name ?? "Mima"}
                className="text-lg font-semibold tracking-tight truncate [&_div]:text-lg [&_div]:mt-0"
              />
              <Tooltip content={t("vaultSettings")} side="bottom">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={handleOpenSettings}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <LangSwitcher />
              <Tooltip content={t("lockVault")} side="bottom">
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" onClick={handleClose}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </motion.div>
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
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
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
                <Button
                  variant="link"
                  onClick={handleCreate}
                  className="mt-1 text-primary"
                >
                  {t("addFirst")}
                </Button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={rectIntersection}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <AnimatePresence>
                  {filtered.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <SortableEntryItem
                        entry={entry}
                        isSelected={selectedId === entry.id}
                        onSelect={() => selectEntry(entry.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <StatefulButton
              onClick={handleCreate}
              className="flex-1"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {t("newEntry")}
            </StatefulButton>
            <Tooltip content={t("export")} side="bottom">
              <Button
                variant="ghost"
                size="icon"
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
              </Button>
            </Tooltip>
            <Tooltip content={t("import")} side="bottom">
              <Button
                variant="ghost"
                size="icon"
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
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Detail pane */}
      <div className={`flex-1 flex flex-col relative z-10 ${selected ? '' : 'hidden md:flex'}`}>
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              variants={detailVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex-1 overflow-y-auto p-6 lg:p-10"
            >
              <div className="space-y-6">
                <div className="md:hidden -mb-3">
                  <Tooltip content={t("back")} side="bottom">
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button variant="ghost" size="icon" onClick={() => selectEntry(null)}>
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </motion.div>
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
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(selected)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </Tooltip>
                </div>

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
                  {selected.url && (
                    <FieldCard
                      index={2}
                      icon={<Globe className="w-4 h-4" />}
                      label={t("url")}
                      value={selected.url}
                      copied={copiedField === `url-${selected.id}`}
                      onCopy={() => handleCopy(selected.url!, `url-${selected.id}`)}
                    />
                  )}
                  {selected.notes && (
                    <FieldCard
                      index={3}
                      icon={<FileText className="w-4 h-4" />}
                      label={t("notes")}
                      value={selected.notes}
                      multiline
                      copied={copiedField === `notes-${selected.id}`}
                      onCopy={() => handleCopy(selected.notes!, `notes-${selected.id}`)}
                    />
                  )}
                </div>

                {/* Delete */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="pt-4 border-t border-border"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-danger transition-colors"
                    onClick={() => setDeleteConfirmId(selected.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("deleteEntry")}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center text-muted-foreground"
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

      <EntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editingEntry}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("vaultSettings")}</DialogTitle>
            <DialogDescription>{t("vaultSettingsDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("vaultName")}</label>
              <Input
                value={vaultNameInput}
                onChange={(e) => setVaultNameInput(e.target.value)}
                placeholder={t("enterVaultName")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSaveSettings} disabled={!vaultNameInput.trim()}>
              {t("saveVaultSettings")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>
            <DialogTitle className="text-center">{t("confirmDelete")}</DialogTitle>
            <DialogDescription className="text-center">
              {t("confirmDeleteMessage")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId !== null && handleDelete(deleteConfirmId)}
            >
              {t("deleteEntry")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <CardSpotlight className="p-4 rounded-2xl border-white/[0.2]" radius={250}>
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
              className={`flex-1 text-sm text-white/90 select-all ${
                isSecret && !revealed
                  ? "font-mono tracking-[0.3em]"
                  : multiline
                    ? "whitespace-pre-wrap"
                    : ""
              }`}
            >
              {value}
            </span>
            <div className="flex gap-0.5">
              {onToggleReveal && (
                <Tooltip content={revealed ? t("hide") : t("show")} side="top">
                  <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onToggleReveal}
                    >
                      {revealed ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </motion.div>
                </Tooltip>
              )}
              <Tooltip content={copied ? t("copied") : t("copy")} side="top">
                <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onCopy}
                  >
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
                  </Button>
                </motion.div>
              </Tooltip>
            </div>
          </div>
        </div>
      </CardSpotlight>
    </motion.div>
  );
}
