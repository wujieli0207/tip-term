import { invoke } from "@tauri-apps/api/core";
import { homeDir, join } from "@tauri-apps/api/path";
import type { TerminalConfig } from "./schema";
import { buildDefaultTerminalConfig } from "./defaults";
import { useTerminalConfigStore } from "../../stores/terminalConfigStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { updateTerminalConfig } from "../terminalRegistry";

const CONFIG_RELATIVE_PATH = ".config/tipterm/config.json";

export async function resolveTerminalConfigPath(): Promise<string> {
  const home = await homeDir();
  return join(home, CONFIG_RELATIVE_PATH);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeDeep<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergeDeep(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

function sanitizeConfig(config: TerminalConfig): TerminalConfig {
  if (!Array.isArray(config.colors) || config.colors.length !== 16) {
    const defaults = buildDefaultTerminalConfig();
    return { ...config, colors: defaults.colors };
  }
  return config;
}

export async function loadTerminalConfig(): Promise<TerminalConfig> {
  const defaults = buildDefaultTerminalConfig();
  const path = await resolveTerminalConfigPath();

  try {
    const raw = await invoke<string>("read_file", { path });
    const parsed = JSON.parse(raw) as Partial<TerminalConfig>;
    const merged = mergeDeep(defaults as unknown as Record<string, unknown>, parsed as Record<string, unknown>);
    return sanitizeConfig(merged as TerminalConfig);
  } catch (error) {
    console.warn("[terminal-config] Failed to load config, using defaults:", error);
    return defaults;
  }
}

export function applyTerminalConfig(config: TerminalConfig): void {
  useTerminalConfigStore.getState().setConfig(config);

  const settings = useSettingsStore.getState();
  settings.setFontFamily(config.fontFamily);
  settings.setFontSize(config.fontSize);
  settings.setLineHeight(config.lineHeight);
  settings.setCursorStyle(config.cursorShape);
  settings.setCursorBlink(config.cursorBlink);
  settings.setTerminalSetting("webGLRenderer", config.webGLRenderer);
  settings.setTerminalSetting("ligatures", config.ligatures);
  settings.setTerminalSetting("quickEdit", config.quickEdit);
  settings.setTerminalSetting("copyOnSelect", config.copyOnSelect);
  settings.setTerminalSetting("webLinksActivationKey", config.webLinksActivationKey);
  settings.setTerminalSetting("bell", config.bell);

  updateTerminalConfig(config);
}

export async function reloadTerminalConfig(): Promise<TerminalConfig> {
  const config = await loadTerminalConfig();
  applyTerminalConfig(config);
  return config;
}
