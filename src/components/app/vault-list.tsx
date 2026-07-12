import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "motion/react";
import {
  Lock,
  Plus,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Fingerprint,
  ArrowLeft,
} from "lucide-react";
import mimaIcon from "@/assets/mima.svg";
import { useApp } from "@/stores/app";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { IconButton } from "@/components/ui/icon-button";

import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { DangerButton } from "@/components/ui/danger-button";
import { Tooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Modal, ModalBody, ModalContent } from "@/components/ui/animated-modal";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { LangSwitcher } from "./lang-switcher";
import { WaveBackground } from "./wave-background";
import { VaultCard } from "./vault-card";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

function ViewWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2 mb-6">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3"
        >
          <img src={mimaIcon} alt="Mima" className="w-10 h-10" />
        </motion.div>
        <TextGenerateEffect
          words="Mima"
          className="text-xl font-semibold tracking-tight [&_div]:text-xl"
        />
      </div>
      {children}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center"
      >
        <LangSwitcher />
      </motion.div>
    </div>
  );
}

export function VaultList() {
  const navigate = useNavigate();
  const { vaults, loadVaults, createVault, deleteVault, openVault, checkBiometricEnabled, biometricUnlock } = useApp();

  useLocale();

  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [vaultName, setVaultName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [unlockingVaultId, setUnlockingVaultId] = useState<number | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockShowPassword, setUnlockShowPassword] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showAllVaults, setShowAllVaults] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(5);

  const [items, setItems] = useState(vaults);
  const [dragActive, setDragActive] = useState(false);
  const [activeDragVault, setActiveDragVault] = useState<typeof vaults[0] | null>(null);

  useEffect(() => {
    setItems(vaults);
  }, [vaults]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragActive(true);
    const vault = vaults.find((v) => v.id === event.active.id);
    if (vault) setActiveDragVault(vault);
  }, [vaults]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((v) => v.id === active.id);
      const newIdx = prev.findIndex((v) => v.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDragActive(false);
    setActiveDragVault(null);
  }, []);

  useEffect(() => {
    loadVaults().finally(() => setLoading(false));
  }, [loadVaults]);

  useEffect(() => {
    if (deleteId !== null) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [deleteId]);

  useEffect(() => {
    if (unlockingVaultId !== null) {
      checkBiometricEnabled(unlockingVaultId).then(setBiometricAvailable);
    }
  }, [unlockingVaultId, checkBiometricEnabled]);

  const showAllVaultsRef = useRef(showAllVaults);
  showAllVaultsRef.current = showAllVaults;
  const unlockingRef = useRef<number | null>(unlockingVaultId);
  unlockingRef.current = unlockingVaultId;
  const showCreateRef = useRef(showCreate);
  showCreateRef.current = showCreate;
  const deleteIdRef = useRef<number | null>(deleteId);
  deleteIdRef.current = deleteId;

  useEffect(() => {
    const handlePopState = () => {
      if (deleteIdRef.current !== null) {
        setDeleteId(null);
        return;
      }
      if (unlockingRef.current !== null) {
        setUnlockingVaultId(null);
        setUnlockPassword("");
        setUnlockError("");
        return;
      }
      if (showCreateRef.current) {
        setShowCreate(false);
        setError("");
        return;
      }
      if (showAllVaultsRef.current) {
        setShowAllVaults(false);
        return;
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (showAllVaults) {
      window.history.pushState({ __view: "allVaults" }, "", window.location.href);
    }
  }, [showAllVaults]);

  useEffect(() => {
    if (unlockingVaultId !== null) {
      window.history.pushState({ __view: "unlock" }, "", window.location.href);
    }
  }, [unlockingVaultId]);

  useEffect(() => {
    if (showCreate) {
      window.history.pushState({ __view: "create" }, "", window.location.href);
    }
  }, [showCreate]);

  const handleCreate = useCallback(async () => {
    if (!vaultName.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordsDontMatch"));
      return;
    }
    setCreating(true);
    setError("");
    try {
      await createVault(vaultName, password);
      navigate("/vault");
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  }, [vaultName, password, confirm, createVault, navigate]);

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteVault(id);
      setDeleteId(null);
    },
    [deleteVault]
  );

  const handleUnlock = useCallback(async () => {
    if (unlockingVaultId === null) return;
    setUnlockLoading(true);
    setUnlockError("");
    try {
      const ok = await openVault(unlockingVaultId, unlockPassword);
      if (ok) {
        navigate("/vault");
      } else {
        setUnlockError(t("incorrectPassword"));
      }
    } catch (e) {
      setUnlockError(String(e));
    } finally {
      setUnlockLoading(false);
    }
  }, [unlockingVaultId, unlockPassword, openVault, navigate]);

  const handleBiometricUnlock = useCallback(async () => {
    if (unlockingVaultId === null) return;
    setBiometricLoading(true);
    setUnlockError("");
    try {
      const ok = await biometricUnlock(unlockingVaultId);
      if (ok) {
        navigate("/vault");
      } else {
        setUnlockError(t("biometricFailed"));
      }
    } catch (e) {
      setUnlockError(String(e));
    } finally {
      setBiometricLoading(false);
    }
  }, [unlockingVaultId, biometricUnlock, navigate]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-surface p-4 relative">
      <div className="fixed inset-0 z-0">
        <WaveBackground />
      </div>

      <div className="min-h-full flex items-center justify-center relative z-10">
        <div className="relative w-full max-w-md">
        <AnimatePresence mode="wait">

        {/* Vault list */}
        {unlockingVaultId ? (
          <motion.div
            key="unlock"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
          <ViewWrapper>
          <CardSpotlight
            className="bg-surface border-border/50 rounded-2xl p-6"
            radius={300}
          >
            <div className="space-y-6">
              <div className="text-center space-y-1.5">
                <TextGenerateEffect
                  words={vaults.find((v) => v.id === unlockingVaultId)?.name ?? ""}
                  className="text-xl font-semibold tracking-tight [&_div]:text-xl"
                />
                <p className="text-sm text-muted-foreground">
                  {t("unlockDesc")}
                </p>
              </div>

              {unlockError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-danger/10 border border-danger/30 text-danger rounded-lg px-3 py-2 text-sm"
                >
                  {unlockError}
                </motion.div>
              )}

              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                onSubmit={(e) => { e.preventDefault(); handleUnlock(); }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="master-password">{t("masterPassword")}</Label>
                  <div className="relative group">
                    <Input
                      id="master-password"
                      type={unlockShowPassword ? "text" : "password"}
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      placeholder={t("enterMasterPassword")}
                      autoComplete="off"
                      className="pr-10 font-mono transition-shadow duration-300 focus:shadow-[0_0_20px_-3px_oklch(0.65_0.2_250/0.3)]"
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Tooltip content={unlockShowPassword ? t("hide") : t("show")} side="top">
                        <IconButton
                          type="button"
                          onClick={() => setUnlockShowPassword(!unlockShowPassword)}
                          className="h-7 w-7"
                        >
                          {unlockShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <PrimaryButton
                    className="w-full"
                    disabled={unlockLoading || !unlockPassword}
                    onClick={handleUnlock}
                  >
                    {t("unlockBtn")}
                  </PrimaryButton>
                </motion.div>
              </motion.form>

              {biometricAvailable && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-px flex-1 w-8 bg-border" />
                    {t("biometricUnlock")}
                    <span className="h-px flex-1 w-8 bg-border" />
                  </div>
                </motion.div>
              )}

              {biometricAvailable && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.32 }}
                  className="flex justify-center"
                >
                  <IconButton
                    type="button"
                    onClick={handleBiometricUnlock}
                    disabled={biometricLoading}
                    className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:text-primary disabled:opacity-50"
                  >
                    {biometricLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <Fingerprint className="w-6 h-6" />
                      </motion.div>
                    ) : (
                      <Fingerprint className="w-6 h-6" />
                    )}
                  </IconButton>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <SecondaryButton
                  className="mx-auto"
                  onClick={() => {
                    setUnlockingVaultId(null);
                    setUnlockPassword("");
                    setUnlockError("");
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("backToVaults")}
                </SecondaryButton>
              </motion.div>
            </div>
          </CardSpotlight>
          </ViewWrapper>
          </motion.div>
        ) : vaults.length === 0 && !showCreate ? (
          <motion.div
            key="empty"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
          <ViewWrapper>
          <CardSpotlight
            className="bg-surface border-border/50 rounded-2xl p-6"
            radius={300}
          >
            <div className="text-center space-y-4">
              <TextGenerateEffect
                words={t("noVaults")}
                className="text-lg font-semibold tracking-tight [&_div]:text-lg"
              />
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <PrimaryButton
                  className="w-full"
                  onClick={() => setShowCreate(true)}
                >
                  <span className="inline-flex items-center whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-2 shrink-0" />
                    {t("createFirstVault")}
                  </span>
                </PrimaryButton>
              </motion.div>
            </div>
          </CardSpotlight>
          </ViewWrapper>
          </motion.div>
        ) : showCreate ? (
          <motion.div
            key="create"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
          <ViewWrapper>
          <CardSpotlight
            className="bg-surface border-border/50 rounded-2xl p-6"
            radius={300}
          >
            <div className="space-y-4">
              <TextGenerateEffect
                words={t("createVault")}
                className="text-lg font-semibold tracking-tight text-center [&_div]:text-lg"
              />
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-danger/10 border border-danger/30 text-danger rounded-lg px-3 py-2 text-sm"
                >
                  {error}
                </motion.div>
              )}
              <div className="space-y-2">
                <Label htmlFor="vault-name">{t("vaultName")}</Label>
                <Input
                  id="vault-name"
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  placeholder={t("enterVaultName")}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="master-password">{t("masterPassword")}</Label>
                <Input
                  id="master-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("enterMasterPassword")}
                  autoComplete="new-password"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t("confirmMasterPassword")}
                  autoComplete="new-password"
                  className="font-mono"
                />
              </div>
              <div className="flex gap-2">
                <SecondaryButton
                  className="flex-1"
                  onClick={() => {
                    setShowCreate(false);
                    setError("");
                  }}
                >
                  {t("cancel")}
                </SecondaryButton>
                <PrimaryButton
                  className="flex-1"
                  disabled={creating || !vaultName || !password}
                  onClick={handleCreate}
                >
                  {t("createVaultBtn")}
                </PrimaryButton>
              </div>
            </div>
          </CardSpotlight>
          </ViewWrapper>
          </motion.div>
        ) : showAllVaults ? (
          <motion.div
            key="allVaults"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
          <ViewWrapper>
          <CardSpotlight
            className="bg-surface border-border/50 rounded-2xl p-6"
            radius={300}
          >
            <div className="space-y-4">
              <TextGenerateEffect
                words={t("allVaults")}
                className="text-lg font-semibold tracking-tight text-center [&_div]:text-lg"
              />
              <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={items.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                  {items.map((vault) => (
                    <VaultCard
                      key={vault.id}
                      id={vault.id}
                      sortable
                      name={vault.name}
                      createdAt={vault.created_at}
                      onClick={() => {
                        setUnlockingVaultId(vault.id);
                        setUnlockPassword("");
                        setUnlockError("");
                      }}
                      onDelete={() => setDeleteId(vault.id)}
                    />
                  ))}
                </SortableContext>
                <DragOverlay style={{ pointerEvents: "none" }}>
                  {activeDragVault ? (
                    <VaultCard
                      id={activeDragVault.id}
                      sortable
                      name={activeDragVault.name}
                      createdAt={activeDragVault.created_at}
                      onClick={() => {}}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            <PrimaryButton
              className="w-full"
              onClick={() => {
                setShowCreate(true);
                setVaultName("");
                setPassword("");
                setConfirm("");
                setError("");
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("createVaultBtn")}
            </PrimaryButton>
            <SecondaryButton
              className="mx-auto"
              onClick={() => setShowAllVaults(false)}
            >
              <ArrowLeft className="w-4 h-4" />
              {t("back")}
            </SecondaryButton>
            </div>
          </CardSpotlight>
          </ViewWrapper>
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
          <ViewWrapper>
          <CardSpotlight
            className="bg-surface border-border/50 rounded-2xl p-6"
            radius={300}
          >
            <div className="space-y-4">
              <TextGenerateEffect
                words={t("recentVault")}
                className="text-lg font-semibold tracking-tight text-center [&_div]:text-lg"
              />
              <VaultCard
                name={vaults[0].name}
                createdAt={vaults[0].created_at}
                onClick={() => {
                  setUnlockingVaultId(vaults[0].id);
                  setUnlockPassword("");
                  setUnlockError("");
                }}
              />
              <PrimaryButton
                className="mx-auto"
                onClick={() => setShowAllVaults(true)}
              >
                {t("viewAllVaults", { n: vaults.length })}
              </PrimaryButton>
            </div>
          </CardSpotlight>
          </ViewWrapper>
          </motion.div>
        )}
        </AnimatePresence>
        </div>
      </div>

      <Modal open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <ModalBody>
          <ModalContent className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>
            <h2 className="text-lg font-semibold mb-2">{t("confirmDeleteVault")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("confirmDeleteVaultMessage", {
                name: vaults.find((v) => v.id === deleteId)?.name ?? "",
              })}
            </p>
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-3 text-sm text-danger/90 text-center mb-4">
              {t("deleteVaultWarning")}
            </div>
            <div className="flex gap-3 justify-center">
              <SecondaryButton onClick={() => setDeleteId(null)}>
                {t("cancel")}
              </SecondaryButton>
              <DangerButton
                disabled={countdown > 0}
                onClick={() => deleteId !== null && handleDelete(deleteId)}
              >
                {countdown > 0
                  ? t("deleteVaultCountdown", { n: countdown })
                  : t("deleteVault")}
              </DangerButton>
            </div>
          </ModalContent>
        </ModalBody>
      </Modal>
    </div>
  );
}
