import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSessionStore } from "../stores/sessionStore";
import { isShellProcess, sendNotification } from "../utils/notifications";

interface ProcessInfo {
  name: string;
  cwd: string;
}

export function useProcessPolling() {
  const previousProcesses = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const { getTerminalSessions, updateSessionProcessInfo, activeSessionId } =
        useSessionStore.getState();
      const sessions = getTerminalSessions();

      for (const session of sessions) {
        try {
          const info = await invoke<ProcessInfo | null>("get_session_info", { id: session.id });
          if (info) {
            const previousProcess = previousProcesses.current.get(session.id);
            const currentProcess = info.name;

            if (
              session.notifyWhenDone &&
              session.id !== activeSessionId &&
              previousProcess &&
              !isShellProcess(previousProcess) &&
              isShellProcess(currentProcess)
            ) {
              await sendNotification({
                title: "Command Completed",
                body: `"${previousProcess}" finished`,
                sessionId: session.id,
              });
            }

            previousProcesses.current.set(session.id, currentProcess);
            updateSessionProcessInfo(session.id, info.name, info.cwd);
          }
        } catch (error) {
          console.error(`[App] Failed to get process info for ${session.id}:`, error);
        }
      }

      const sessionIds = new Set(sessions.map((s) => s.id));
      for (const id of previousProcesses.current.keys()) {
        if (!sessionIds.has(id)) {
          previousProcesses.current.delete(id);
        }
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, []);
}
