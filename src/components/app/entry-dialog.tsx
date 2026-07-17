import { useState, useCallback, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wand2, Loader2, ScanLine, Plus, X, AlertTriangle } from "lucide-react";
import jsQR from "jsqr";
import { useApp, type Entry } from "@/stores/app";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { useBackLayer } from "@/lib/history-back";
import { IconButton } from "@/components/ui/icon-button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { DangerButton } from "@/components/ui/danger-button";
import { Tooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  useModal,
} from "@/components/ui/animated-modal";

const formSchema = z.object({
  name: z.string().min(1, t("nameRequired")),
  username: z.string().min(1, t("usernameRequired")),
  password: z.string().min(1, t("passwordRequired")),
  url: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  totp: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: Entry | null;
}

export function EntryDialog({ open, onOpenChange, entry }: Props) {
  useBackLayer(open, () => onOpenChange(false));
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <EntryDialogInner open={open} onOpenChange={onOpenChange} entry={entry} />
    </Modal>
  );
}

type CustomField = { key: string; value: string };

function EntryDialogInner({ open, onOpenChange, entry }: Props) {
  const { createEntry, updateEntry, generatePassword } = useApp();
  const { open: isOpen, setOpen } = useModal();

  useLocale();

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    setOpen(open);
  }, [open, setOpen]);

  useEffect(() => {
    if (!isOpen && open) {
      onOpenChange(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (open) {
      if (entry) {
        reset({
          name: entry.name,
          username: entry.username,
          password: entry.password,
          url: entry.url ?? "",
          notes: entry.notes ?? "",
          totp: entry.totp ?? "",
          tags: entry.tags ?? "",
        });
        if (entry.custom_fields) {
          try {
            const parsed = JSON.parse(entry.custom_fields);
            if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
              setCustomFields(
                Object.entries(parsed).map(([k, v]) => ({ key: k, value: String(v) }))
              );
            } else {
              setCustomFields([]);
            }
          } catch {
            setCustomFields([]);
          }
        } else {
          setCustomFields([]);
        }
      } else {
        reset({ name: "", username: "", password: "", url: "", notes: "", totp: "", tags: "" });
        setCustomFields([]);
      }
    }
  }, [open, entry, reset]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const pwd = await generatePassword(20);
    setValue("password", pwd);
    setGenerating(false);
  }, [generatePassword, setValue]);

  const handleScanQr = useCallback(async () => {
    setScanning(true);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (!type.startsWith("image/")) continue;
          const blob = await item.getType(type);
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(bitmap, 0, 0);
          const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          bitmap.close();
          if (code?.data.startsWith("otpauth://")) {
            const url = new URL(code.data);
            const secret = url.searchParams.get("secret") || "";
            setValue("totp", secret);
            return;
          }
        }
      }
      alert(t("qrNotFound"));
    } catch (e) {
      alert(t("qrScanFailed"));
    } finally {
      setScanning(false);
    }
  }, [setValue]);

  const addCustomField = useCallback(() => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  }, []);

  const removeCustomField = useCallback((index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCustomField = useCallback(
    (index: number, field: "key" | "value", val: string) => {
      setCustomFields((prev) =>
        prev.map((cf, i) => (i === index ? { ...cf, [field]: val } : cf))
      );
    },
    []
  );

  const close = useCallback(() => {
    setOpen(false);
    onOpenChange(false);
  }, [setOpen, onOpenChange]);

  const onSubmit = useCallback(
    async (data: FormData) => {
      setSaving(true);
      try {
        const filledFields = customFields.filter((cf) => cf.key.trim() !== "");
        const customFieldsJson =
          filledFields.length > 0
            ? JSON.stringify(
                Object.fromEntries(filledFields.map((cf) => [cf.key.trim(), cf.value]))
              )
            : null;
        const payload = {
          ...data,
          url: data.url || null,
          notes: data.notes || null,
          totp: data.totp ? data.totp.replace(/[^A-Za-z2-7=]/g, "").toUpperCase() : null,
          tags: data.tags || null,
          custom_fields: customFieldsJson,
        };
        if (entry) {
          await updateEntry(entry.id, payload);
        } else {
          await createEntry(payload);
        }
        close();
      } finally {
        setSaving(false);
      }
    },
    [entry, createEntry, updateEntry, close, customFields]
  );

  const passwordValue = watch("password");

  return (
    <ModalBody className="overflow-y-auto overflow-x-hidden">
      <ModalContent>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h2 className="text-lg font-semibold">
            {entry ? t("editEntry") : t("newEntry")}
          </h2>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder={t("namePlaceholder")}
              autoFocus
              className="transition-shadow duration-300 focus:shadow-[0_0_15px_-3px_oklch(0.65_0.2_250/0.3)]"
            />
            <AnimatePresence>
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-danger"
                >
                  {errors.name.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">{t("username")}</Label>
            <Input
              id="username"
              {...register("username")}
              placeholder={t("usernamePlaceholder")}
              className="transition-shadow duration-300 focus:shadow-[0_0_15px_-3px_oklch(0.65_0.2_250/0.3)]"
            />
            <AnimatePresence>
              {errors.username && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-danger"
                >
                  {errors.username.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <div className="flex gap-2">
              <PasswordInput
                id="password"
                {...register("password")}
                placeholder={t("passwordPlaceholder")}
                className="font-mono transition-shadow duration-300 focus:shadow-[0_0_15px_-3px_oklch(0.65_0.2_250/0.3)]"
                wrapperClassName="flex-1"
              />
              <Tooltip content={t("generatePassword")} side="bottom">
                <IconButton
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                </IconButton>
              </Tooltip>
            </div>
            <AnimatePresence>
              {passwordValue && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-muted-foreground overflow-hidden"
                >
                  {t("lengthLabel", { n: passwordValue.length })}
                </motion.p>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-danger"
                >
                  {errors.password.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">{t("url")} ({t("optional")})</Label>
            <Input
              id="url"
              {...register("url")}
              placeholder={t("urlPlaceholder")}
              className="transition-shadow duration-300 focus:shadow-[0_0_15px_-3px_oklch(0.65_0.2_250/0.3)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("notes")} ({t("optional")})</Label>
            <textarea
              id="notes"
              {...register("notes")}
              rows={5}
              autoComplete="off"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-shadow duration-300 focus:shadow-[0_0_15px_-3px_oklch(0.65_0.2_250/0.3)]"
              placeholder={t("notesPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totp">{t("totpSecret")} ({t("optional")})</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="totp"
                  {...register("totp")}
                  placeholder={t("totpPlaceholder")}
                  className="font-mono transition-shadow duration-300 focus:shadow-[0_0_15px_-3px_oklch(0.65_0.2_250/0.3)]"
                />
              </div>
              <Tooltip content={t("scanQr")} side="bottom">
                <IconButton
                  type="button"
                  onClick={handleScanQr}
                  disabled={scanning}
                >
                  {scanning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ScanLine className="w-4 h-4" />
                  )}
                </IconButton>
              </Tooltip>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">{t("tags")} ({t("optional")})</Label>
            <Input
              id="tags"
              {...register("tags")}
              placeholder={t("tagsPlaceholder")}
              className="transition-shadow duration-300 focus:shadow-[0_0_15px_-3px_oklch(0.65_0.2_250/0.3)]"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("customFields")} ({t("optional")})</Label>
              <button
                type="button"
                onClick={addCustomField}
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("addCustomField")}
              </button>
            </div>
            <AnimatePresence>
              {customFields.map((cf, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2 items-start"
                >
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder={t("customFieldKey")}
                      value={cf.key}
                      onChange={(e) => updateCustomField(i, "key", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder={t("customFieldValue")}
                      value={cf.value}
                      onChange={(e) => updateCustomField(i, "value", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <IconButton
                    type="button"
                    onClick={() => setConfirmRemoveIndex(i)}
                    className="h-9 w-9 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </IconButton>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <SecondaryButton type="button" onClick={close}>
              {t("cancel")}
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {entry ? t("save") : t("create")}
            </PrimaryButton>
          </div>
        </form>

        <Modal open={confirmRemoveIndex !== null} onOpenChange={() => setConfirmRemoveIndex(null)}>
          <ModalBody>
            <ModalContent className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-danger" />
              </div>
              <h2 className="text-lg font-semibold mb-2">{t("removeCustomField")}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {t("confirmRemoveCustomField", {
                  name: confirmRemoveIndex !== null ? (customFields[confirmRemoveIndex]?.key || "") : "",
                })}
              </p>
              <div className="flex gap-3 justify-center">
                <SecondaryButton onClick={() => setConfirmRemoveIndex(null)}>
                  {t("cancel")}
                </SecondaryButton>
                <DangerButton
                  onClick={() => {
                    if (confirmRemoveIndex !== null) {
                      removeCustomField(confirmRemoveIndex);
                      setConfirmRemoveIndex(null);
                    }
                  }}
                >
                  {t("removeCustomField")}
                </DangerButton>
              </div>
            </ModalContent>
          </ModalBody>
        </Modal>
      </ModalContent>
    </ModalBody>
  );
}
