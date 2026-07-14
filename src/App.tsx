import { useEffect } from "react";
import { useView } from "@/lib/navigation";
import { VaultList } from "@/components/app/vault-list";
import { Vault } from "@/components/app/vault";

export default function App() {
  useEffect(() => {
    if (import.meta.env.PROD) {
      const handler = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", handler);
      return () => document.removeEventListener("contextmenu", handler);
    }
  }, []);

  const view = useView();

  return view === "vault" ? <Vault /> : <VaultList />;
}
