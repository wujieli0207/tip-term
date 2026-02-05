import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { reloadTerminalConfig, resolveTerminalConfigPath } from "./loader";

const CONFIG_EVENT = "terminal-config-changed";

export async function startTerminalConfigWatcher(): Promise<() => void> {
  const path = await resolveTerminalConfigPath();
  await invoke("start_terminal_config_watcher", { path });

  const unlisten = await listen<string>(CONFIG_EVENT, async () => {
    await reloadTerminalConfig();
  });

  return () => {
    unlisten();
  };
}
