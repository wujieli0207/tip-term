import { invoke } from "@tauri-apps/api/core";
import { appConfigDir, join } from "@tauri-apps/api/path";
import type { TerminalConfig } from "./schema";
import { buildDefaultTerminalConfig } from "./defaults";
import { useTerminalConfigStore } from "../../stores/terminalConfigStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { updateTerminalConfig } from "../terminalRegistry";
import { sendNotification } from "../../utils/notifications";

const CONFIG_RELATIVE_PATH = "tipterm/config.json";

export async function resolveTerminalConfigPath(): Promise<string> {
  const base = await appConfigDir();
  return join(base, CONFIG_RELATIVE_PATH);
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

function isValidEnum<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function validateTerminalConfig(config: TerminalConfig): { config: TerminalConfig; errors: string[] } {
  const defaults = buildDefaultTerminalConfig();
  const errors: string[] = [];
  const next = { ...config };

  if (typeof next.fontFamily !== "string" || next.fontFamily.trim().length === 0) {
    next.fontFamily = defaults.fontFamily;
    errors.push("fontFamily: invalid");
  }
  if (typeof next.fontSize !== "number" || next.fontSize <= 0) {
    next.fontSize = defaults.fontSize;
    errors.push("fontSize: must be > 0");
  }
  if (typeof next.lineHeight !== "number" || next.lineHeight <= 0) {
    next.lineHeight = defaults.lineHeight;
    errors.push("lineHeight: must be > 0");
  }
  if (typeof next.letterSpacing !== "number" || next.letterSpacing < 0) {
    next.letterSpacing = defaults.letterSpacing;
    errors.push("letterSpacing: must be >= 0");
  }
  if (typeof next.padding !== "string") {
    next.padding = defaults.padding;
    errors.push("padding: invalid");
  }
  if (typeof next.scrollback !== "number" || next.scrollback < 0) {
    next.scrollback = defaults.scrollback;
    errors.push("scrollback: must be >= 0");
  }
  if (!Array.isArray(next.colors) || next.colors.length !== 16) {
    next.colors = defaults.colors;
    errors.push("colors: must contain 16 entries");
  }

  const cursorShapes = ["block", "underline", "bar"] as const;
  if (!isValidEnum(next.cursorShape, cursorShapes)) {
    next.cursorShape = defaults.cursorShape;
    errors.push("cursorShape: invalid");
  }

  const bellModes = ["off", "sound", "visual", "both"] as const;
  if (!isValidEnum(next.bell, bellModes)) {
    next.bell = defaults.bell;
    errors.push("bell: invalid");
  }

  const activationKeys = ["ctrl", "alt", "meta", "shift"] as const;
  if (
    !(next.webLinksActivationKey === null || isValidEnum(next.webLinksActivationKey, activationKeys))
  ) {
    next.webLinksActivationKey = defaults.webLinksActivationKey;
    errors.push("webLinksActivationKey: invalid");
  }

  const macOptionModes = ["force", "selection"] as const;
  if (!isValidEnum(next.macOptionSelectionMode, macOptionModes)) {
    next.macOptionSelectionMode = defaults.macOptionSelectionMode;
    errors.push("macOptionSelectionMode: invalid");
  }

  if (typeof next.modifierKeys?.altIsMeta !== "boolean") {
    next.modifierKeys = { ...next.modifierKeys, altIsMeta: defaults.modifierKeys.altIsMeta };
    errors.push("modifierKeys.altIsMeta: invalid");
  }
  if (typeof next.modifierKeys?.cmdIsMeta !== "boolean") {
    next.modifierKeys = { ...next.modifierKeys, cmdIsMeta: defaults.modifierKeys.cmdIsMeta };
    errors.push("modifierKeys.cmdIsMeta: invalid");
  }

  if (typeof next.shell !== "string" || next.shell.trim().length === 0) {
    next.shell = defaults.shell;
    errors.push("shell: invalid");
  }
  if (!Array.isArray(next.shellArgs)) {
    next.shellArgs = defaults.shellArgs;
    errors.push("shellArgs: invalid");
  }

  return { config: next, errors };
}

export async function loadTerminalConfig(): Promise<TerminalConfig> {
  const defaults = buildDefaultTerminalConfig();
  const path = await resolveTerminalConfigPath();

  try {
    const raw = await invoke<string>("read_file", { path });
    const parsed = JSON.parse(raw) as Partial<TerminalConfig>;
    const merged = mergeDeep(defaults as unknown as Record<string, unknown>, parsed as Record<string, unknown>);
    const validated = validateTerminalConfig(merged as TerminalConfig);
    if (validated.errors.length > 0) {
      console.warn("[terminal-config] Validation errors:", validated.errors);
      sendNotification({
        title: "Terminal Config",
        body: "Config contains invalid values, defaults applied.",
        sessionId: "config",
      }).catch(() => {});
    }
    return validated.config;
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

  updateTerminalConfig(config);
}

export async function reloadTerminalConfig(): Promise<TerminalConfig> {
  const config = await loadTerminalConfig();
  applyTerminalConfig(config);
  return config;
}

export async function ensureTerminalConfigFile(): Promise<TerminalConfig> {
  const defaults = buildDefaultTerminalConfig();
  const path = await resolveTerminalConfigPath();

  try {
    const raw = await invoke<string>("read_file", { path });
    const parsed = JSON.parse(raw) as Partial<TerminalConfig>;
    const merged = mergeDeep(defaults as unknown as Record<string, unknown>, parsed as Record<string, unknown>);
    const validated = validateTerminalConfig(merged as TerminalConfig);
    return validated.config;
  } catch {
    await invoke("write_file", { path, content: JSON.stringify(defaults, null, 2) });
    return defaults;
  }
}

let writeTimeout: number | null = null;

export function scheduleWriteTerminalConfigFile(config: TerminalConfig, delayMs = 300): void {
  if (writeTimeout !== null) {
    clearTimeout(writeTimeout);
  }

  writeTimeout = setTimeout(async () => {
    writeTimeout = null;
    try {
      const path = await resolveTerminalConfigPath();
      await invoke("write_file", { path, content: JSON.stringify(config, null, 2) });
    } catch (error) {
      console.warn("[terminal-config] Failed to write config:", error);
      sendNotification({
        title: "Terminal Config",
        body: "Failed to write config file.",
        sessionId: "config",
      }).catch(() => {});
    }
  }, delayMs) as unknown as number;
}
