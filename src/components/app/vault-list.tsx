import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, type Variants } from "motion/react";
import {
  Lock,
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import mimaIcon from "@/assets/mima.svg";
import { useApp } from "@/stores/app";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { StatefulButton } from "@/components/ui/stateful-button";
import { Tooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LangSwitcher } from "./lang-switcher";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export function VaultList() {
  const navigate = useNavigate();
  const { vaults, loadVaults, createVault, deleteVault } = useApp();

  useLocale();

  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [vaultName, setVaultName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(5);

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
      <DottedGlowBackground
        gap={16}
        radius={1.5}
        color="rgba(255,255,255,0.5)"
        glowColor="rgba(50, 117, 248, 0.6)"
        opacity={0.5}
        speedScale={0.5}


      />

      <div className="min-h-full flex items-center justify-center">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="relative w-full max-w-md space-y-4"
        >
        {/* Header */}
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

        {/* Vault list */}
        {vaults.length === 0 && !showCreate ? (
          <CardSpotlight
            className="bg-surface border-border/50 rounded-2xl p-8"
            radius={300}
          >
            <div className="text-center space-y-4">
              <p className="text-muted-foreground text-sm">
                {t("noVaults")}
              </p>
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <StatefulButton
                  className="w-full"
                  onClick={() => setShowCreate(true)}
                >
                  <span className="inline-flex items-center whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-2 shrink-0" />
                    {t("createFirstVault")}
                  </span>
                </StatefulButton>
              </motion.div>
            </div>
          </CardSpotlight>
        ) : showCreate ? (
          <CardSpotlight
            className="bg-surface border-border/50 rounded-2xl p-8"
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCreate(false);
                    setError("");
                  }}
                >
                  {t("cancel")}
                </Button>
                <StatefulButton
                  className="flex-1"
                  disabled={creating || !vaultName || !password}
                  onClick={handleCreate}
                >
                  {t("createVaultBtn")}
                </StatefulButton>
              </div>
            </div>
          </CardSpotlight>
        ) : (
          <CardSpotlight
            className="bg-surface border-border/50 rounded-2xl p-6"
            radius={300}
          >
            <div className="space-y-4">
              <div className="space-y-2">
              {vaults.map((vault) => (
                <motion.div
                  key={vault.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated border border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/unlock/${vault.id}`)}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{vault.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {vault.created_at}
                    </p>
                  </div>
                  <Tooltip content={t("deleteVault")} side="bottom">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(vault.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                </motion.div>
              ))}
            </div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
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
              </Button>
            </motion.div>
            </div>
          </CardSpotlight>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <LangSwitcher />
        </motion.div>
      </motion.div>
      </div>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>
            <DialogTitle className="text-center">
              {t("confirmDeleteVault")}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t("confirmDeleteVaultMessage", {
                name: vaults.find((v) => v.id === deleteId)?.name ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-danger/5 border border-danger/20 rounded-lg p-3 text-sm text-danger/90 text-center">
            {t("deleteVaultWarning")}
          </div>
          <DialogFooter className="sm:justify-center gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={countdown > 0}
              onClick={() => deleteId !== null && handleDelete(deleteId)}
            >
              {countdown > 0
                ? t("deleteVaultCountdown", { n: countdown })
                : t("deleteVault")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
