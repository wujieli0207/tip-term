import { create } from "zustand";
import type { TerminalConfig } from "../terminal-core/config/schema";
import { buildDefaultTerminalConfig } from "../terminal-core/config/defaults";

interface TerminalConfigState {
  config: TerminalConfig;
  setConfig: (config: TerminalConfig) => void;
}

const initialConfig = buildDefaultTerminalConfig();

export const useTerminalConfigStore = create<TerminalConfigState>((set) => ({
  config: initialConfig,
  setConfig: (config) => set({ config }),
}));
