import { useState, useEffect, useCallback } from "react";
import { Fingerprint, ShieldOff } from "lucide-react";
import { useApp } from "@/stores/app";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { useBackLayer } from "@/lib/history-back";
import { Input } from "@/components/ui/input";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Modal, ModalBody, ModalContent } from "@/components/ui/animated-modal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VaultSettingsDialog({ open, onOpenChange }: Props) {
  useBackLayer(open, () => onOpenChange(false));

  const {
    activeVault,
    renameVault,
    verifyPassword,
    checkBiometricAvailable,
    checkBiometricEnabled,
    enableBiometric,
    disableBiometric,
  } = useApp();

  useLocale();

  const [vaultNameInput, setVaultNameInput] = useState("");
  const [bioPassword, setBioPassword] = useState("");
  const [bioError, setBioError] = useState("");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !activeVault) return;
    setVaultNameInput(activeVault.name);
    setBioPassword("");
    setBioError("");
    checkBiometricAvailable().then(setBioAvailable);
    checkBiometricEnabled(activeVault.id).then(setBioEnabled);
  }, [open, activeVault, checkBiometricAvailable, checkBiometricEnabled]);

  const handleSave = useCallback(async () => {
    if (!activeVault || !vaultNameInput.trim()) return;
    setSaving(true);
    try {
      await renameVault(activeVault.id, vaultNameInput.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }, [activeVault, vaultNameInput, renameVault, onOpenChange]);

  const handleEnableBiometric = useCallback(async () => {
    if (!activeVault || !bioPassword) {
      setBioError(t("passwordRequired"));
      throw new Error("password required");
    }
    setBioError("");
    const ok = await verifyPassword(bioPassword);
    if (!ok) {
      setBioError(t("incorrectPassword"));
      throw new Error("incorrect password");
    }
    try {
      await enableBiometric(activeVault.id, bioPassword);
    } catch (e) {
      setBioError(String(e));
      throw e;
    }
    setBioEnabled(true);
    setBioPassword("");
  }, [activeVault, bioPassword, enableBiometric, verifyPassword]);

  const handleDisableBiometric = useCallback(async () => {
    if (!activeVault) return;
    await disableBiometric(activeVault.id);
    setBioEnabled(false);
  }, [activeVault, disableBiometric]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalBody>
        <ModalContent>
          <h2 className="text-lg font-semibold mb-2">{t("vaultSettings")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("vaultSettingsDesc")}</p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("vaultName")}</label>
              <Input
                value={vaultNameInput}
                onChange={(e) => setVaultNameInput(e.target.value)}
                placeholder={t("enterVaultName")}
              />
            </div>

            {bioAvailable && (
              <>
                <div className="border-t border-border" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{t("biometricUnlock")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("biometricDesc")}</p>

                  {bioEnabled ? (
                    <PrimaryButton
                      size="sm"
                      className="w-full"
                      onClick={handleDisableBiometric}
                    >
                      <ShieldOff className="w-4 h-4 mr-2" />
                      {t("disableBiometric")}
                    </PrimaryButton>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="password"
                        value={bioPassword}
                        onChange={(e) => setBioPassword(e.target.value)}
                        placeholder={t("enterPasswordToEnable")}
                        autoComplete="off"
                        className="font-mono"
                      />
                      {bioError && (
                        <p className="text-xs text-danger">{bioError}</p>
                      )}
                      <PrimaryButton
                        className="w-full"
                        disabled={!bioPassword}
                        onClick={handleEnableBiometric}
                      >
                        <Fingerprint className="w-4 h-4" />
                        {t("enableBiometric")}
                      </PrimaryButton>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <SecondaryButton onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </SecondaryButton>
            <PrimaryButton onClick={handleSave} disabled={!vaultNameInput.trim() || saving}>
              {t("saveVaultSettings")}
            </PrimaryButton>
          </div>
        </ModalContent>
      </ModalBody>
    </Modal>
  );
}
