import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { VaultList } from "@/components/app/vault-list";
import { Unlock } from "@/components/app/unlock";
import { Vault } from "@/components/app/vault";

export default function App() {
  useEffect(() => {
    if (import.meta.env.PROD) {
      const handler = (e: MouseEvent) => e.preventDefault();
      document.addEventListener("contextmenu", handler);
      return () => document.removeEventListener("contextmenu", handler);
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<VaultList />} />
      <Route path="/unlock/:vaultId" element={<Unlock />} />
      <Route path="/vault" element={<Vault />} />
    </Routes>
  );
}
