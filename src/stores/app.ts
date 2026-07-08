import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface Entry {
  id: number;
  name: string;
  username: string;
  password: string;
  url: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VaultInfo {
  id: number;
  name: string;
  path: string;
  created_at: string;
}

export interface ExportEntry {
  name: string;
  username: string;
  password: string;
  url: string | null;
  notes: string | null;
}

export interface ImportPreviewData {
  entries: ExportEntry[];
  count: number;
}

interface AppState {
  vaults: VaultInfo[];
  activeVault: VaultInfo | null;
  isLocked: boolean;
  entries: Entry[];
  searchQuery: string;
  selectedId: number | null;

  loadVaults: () => Promise<void>;
  createVault: (name: string, password: string) => Promise<VaultInfo>;
  openVault: (vaultId: number, password: string) => Promise<boolean>;
  closeVault: () => Promise<void>;
  renameVault: (vaultId: number, newName: string) => Promise<VaultInfo>;
  deleteVault: (vaultId: number) => Promise<void>;
  loadEntries: () => Promise<void>;
  createEntry: (
    data: Omit<Entry, "id" | "sort_order" | "created_at" | "updated_at">
  ) => Promise<void>;
  updateEntry: (
    id: number,
    data: Omit<Entry, "id" | "sort_order" | "created_at" | "updated_at">
  ) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  reorderEntries: (orders: [number, number][]) => Promise<void>;
  generatePassword: (length?: number) => Promise<string>;
  copyToClipboard: (text: string) => Promise<void>;
  setSearch: (q: string) => void;
  selectEntry: (id: number | null) => void;

  exportPlaintext: (savePath: string) => Promise<void>;
  exportEncryptedBackup: (savePath: string, password: string) => Promise<void>;
  previewImport: (filePath: string) => Promise<ImportPreviewData>;
  confirmImport: (filePath: string) => Promise<number>;
  previewEncryptedImport: (
    filePath: string,
    password: string
  ) => Promise<ImportPreviewData>;
  confirmEncryptedImport: (
    filePath: string,
    password: string
  ) => Promise<number>;
}

export const useApp = create<AppState>((set, get) => ({
  vaults: [],
  activeVault: null,
  isLocked: true,
  entries: [],
  searchQuery: "",
  selectedId: null,

  loadVaults: async () => {
    const vaults = await invoke<VaultInfo[]>("list_vaults");
    set({ vaults });
  },

  createVault: async (name, password) => {
    const vault = await invoke<VaultInfo>("create_vault", {
      name,
      masterPassword: password,
    });
    set({ activeVault: vault, isLocked: false, entries: [], selectedId: null, searchQuery: "" });
    return vault;
  },

  openVault: async (vaultId, password) => {
    const ok = await invoke<boolean>("open_vault", {
      vaultId,
      masterPassword: password,
    });
    if (ok) {
      const vault = get().vaults.find((v) => v.id === vaultId) ?? null;
      set({ activeVault: vault, isLocked: false });
      await get().loadEntries();
      return true;
    }
    return false;
  },

  closeVault: async () => {
    await invoke("close_vault");
    set({
      isLocked: true,
      entries: [],
      selectedId: null,
      activeVault: null,
      searchQuery: "",
    });
  },

  renameVault: async (vaultId, newName) => {
    const updated = await invoke<VaultInfo>("rename_vault", {
      vaultId,
      newName,
    });
    const state = get();
    set({
      vaults: state.vaults.map((v) => (v.id === vaultId ? updated : v)),
      activeVault: state.activeVault?.id === vaultId ? updated : state.activeVault,
    });
    return updated;
  },

  deleteVault: async (vaultId) => {
    await invoke("delete_vault", { vaultId });
    if (get().activeVault?.id === vaultId) {
      set({
        activeVault: null,
        isLocked: true,
        entries: [],
        selectedId: null,
        searchQuery: "",
      });
    }
    await get().loadVaults();
  },

  loadEntries: async () => {
    const entries = await invoke<Entry[]>("list_entries");
    set({ entries });
  },

  createEntry: async (data) => {
    await invoke("create_entry", { ...data });
    await get().loadEntries();
  },

  updateEntry: async (id, data) => {
    await invoke("update_entry", { id, ...data });
    await get().loadEntries();
  },

  deleteEntry: async (id) => {
    await invoke("delete_entry", { id });
    set({ selectedId: null });
    await get().loadEntries();
  },

  reorderEntries: async (orders) => {
    await invoke("reorder_entries", { orders });
    await get().loadEntries();
  },

  generatePassword: async (length) => {
    return await invoke<string>("generate_password", { length });
  },

  copyToClipboard: async (text) => {
    await invoke("copy_to_clipboard", { text });
  },

  setSearch: (q) => set({ searchQuery: q }),
  selectEntry: (id) => set({ selectedId: id }),

  exportPlaintext: async (savePath) => {
    await invoke("export_plaintext", { savePath });
  },

  exportEncryptedBackup: async (savePath, password) => {
    await invoke("export_encrypted", {
      savePath,
      backupPassword: password,
    });
  },

  previewImport: async (filePath) => {
    return await invoke<ImportPreviewData>("preview_import", { filePath });
  },

  confirmImport: async (filePath) => {
    const count = await invoke<number>("confirm_import", {
      filePath,
    });
    await get().loadEntries();
    return count;
  },

  previewEncryptedImport: async (filePath, password) => {
    return await invoke<ImportPreviewData>("preview_encrypted_import", {
      filePath,
      backupPassword: password,
    });
  },

  confirmEncryptedImport: async (filePath, password) => {
    const count = await invoke<number>("confirm_encrypted_import", {
      filePath,
      backupPassword: password,
    });
    await get().loadEntries();
    return count;
  },
}));
