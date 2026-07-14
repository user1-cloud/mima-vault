import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wand2, Eye, EyeOff, Loader2, ScanLine } from "lucide-react";
import jsQR from "jsqr";
import { useApp, type Entry } from "@/stores/app";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { IconButton } from "@/components/ui/icon-button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Tooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
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
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: Entry | null;
}

export function EntryDialog({ open, onOpenChange, entry }: Props) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <EntryDialogInner open={open} onOpenChange={onOpenChange} entry={entry} />
    </Modal>
  );
}

function EntryDialogInner({ open, onOpenChange, entry }: Props) {
  const { createEntry, updateEntry, generatePassword } = useApp();
  const { open: isOpen, setOpen } = useModal();

  useLocale();

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [scanning, setScanning] = useState(false);

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
        });
      } else {
        reset({ name: "", username: "", password: "", url: "", notes: "", totp: "" });
      }
      setShowPassword(false);
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
            setValue("totp", code.data);
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

  const close = useCallback(() => {
    setOpen(false);
    onOpenChange(false);
  }, [setOpen, onOpenChange]);

  const onSubmit = useCallback(
    async (data: FormData) => {
      setSaving(true);
      try {
        const payload = {
          ...data,
          url: data.url || null,
          notes: data.notes || null,
          totp: data.totp || null,
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
    [entry, createEntry, updateEntry, close]
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
              <div className="relative flex-1 group">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder={t("passwordPlaceholder")}
                  className="pr-10 font-mono transition-shadow duration-300 focus:shadow-[0_0_15px_-3px_oklch(0.65_0.2_250/0.3)]"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Tooltip content={showPassword ? t("hide") : t("show")} side="top">
                    <IconButton
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-7 w-7"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </IconButton>
                  </Tooltip>
                </div>
              </div>
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
      </ModalContent>
    </ModalBody>
  );
}
