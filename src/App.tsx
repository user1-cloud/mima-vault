import { useEffect } from "react";
import { useView } from "@/lib/navigation";
import { isDesktop } from "@/lib/platform";
import { VaultList } from "@/components/app/vault-list";
import { Vault } from "@/components/app/vault";
import { initTheme } from "@/stores/theme";
import { initAccentColor } from "@/stores/theme-color";

export default function App() {
  useEffect(() => {
    initTheme();
    initAccentColor();
  }, []);

  useEffect(() => {
    if (import.meta.env.PROD) {
      const handler = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", handler);
      return () => document.removeEventListener("contextmenu", handler);
    }
  }, []);

  const view = useView();

  const desktop = isDesktop();

  return (
    <div
      {...(desktop ? { "data-tauri-drag-region": "deep" } : {})}
      className="h-full"
    >
      {view === "vault" ? <Vault /> : <VaultList />}
    </div>
  );
}
