import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, type Variants } from "motion/react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import mimaIcon from "@/assets/mima.svg";
import { useApp } from "@/stores/app";
import { useLocale } from "@/stores/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { StatefulButton } from "@/components/ui/stateful-button";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
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

export function Unlock() {
  const { vaultId } = useParams<{ vaultId: string }>();
  const navigate = useNavigate();
  const { vaults, openVault } = useApp();

  useLocale();

  const vault = vaults.find((v) => v.id === Number(vaultId));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const ok = await openVault(Number(vaultId), password);
      if (ok) {
        navigate("/vault");
      } else {
        setError(t("incorrectPassword"));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [vaultId, password, openVault, navigate]);

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
          className="relative w-full max-w-sm"
        >
        <CardSpotlight className="bg-surface border-border/50 rounded-2xl p-8" radius={300}>
          <div className="space-y-6">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center"
          >
            <img src={mimaIcon} alt="Mima" className="w-10 h-10" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-1.5"
          >
            <TextGenerateEffect
              words={vault?.name ?? ""}
              className="text-xl font-semibold tracking-tight [&_div]:text-xl"
              duration={0.4}
            />
            <p className="text-sm text-muted-foreground">
              {t("unlockDesc")}
            </p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-danger/10 border border-danger/30 text-danger rounded-lg px-3 py-2 text-sm"
            >
              {error}
            </motion.div>
          )}

          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            onSubmit={(e) => e.preventDefault()}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="master-password">{t("masterPassword")}</Label>
              <div className="relative group">
                <Input
                  id="master-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("enterMasterPassword")}
                  autoComplete="off"
                  className="pr-10 font-mono transition-shadow duration-300 focus:shadow-[0_0_20px_-3px_oklch(0.65_0.2_250/0.3)]"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-white transition-colors flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </motion.button>
                </div>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <StatefulButton
                className="w-full"
                disabled={loading || !password}
                onClick={handleUnlock}
              >
                {t("unlockBtn")}
              </StatefulButton>
            </motion.div>
          </motion.form>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("backToVaults")}
          </motion.button>
          </div>
        </CardSpotlight>
        </motion.div>
      </div>
    </div>
  );
}
