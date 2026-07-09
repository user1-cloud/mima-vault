import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wand2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useApp, type Entry } from "@/stores/app";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ModalProvider,
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
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: Entry | null;
}

export function EntryDialog({ open, onOpenChange, entry }: Props) {
  return (
    <ModalProvider>
      <EntryDialogInner open={open} onOpenChange={onOpenChange} entry={entry} />
    </ModalProvider>
  );
}

function EntryDialogInner({ open, onOpenChange, entry }: Props) {
  const { createEntry, updateEntry, generatePassword } = useApp();
  const { open: isOpen, setOpen } = useModal();

  useLocale();

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

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
    if (open) {
      setOpen(true);
    }
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
        });
      } else {
        reset({ name: "", username: "", password: "", url: "", notes: "" });
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
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-white flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </motion.button>
                </div>
              </div>
              <Tooltip content={t("generatePassword")} side="bottom">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                  </Button>
                </motion.div>
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
              rows={2}
              autoComplete="off"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-shadow duration-300 focus:shadow-[0_0_15px_-3px_oklch(0.65_0.2_250/0.3)]"
              placeholder={t("notesPlaceholder")}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button type="button" variant="ghost" onClick={close}>
                {t("cancel")}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {entry ? t("save") : t("create")}
              </Button>
            </motion.div>
          </div>
        </form>
      </ModalContent>
    </ModalBody>
  );
}
