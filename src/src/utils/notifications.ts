import {
  isPermissionGranted,
  requestPermission,
  sendNotification as tauriSendNotification,
} from "@tauri-apps/plugin-notification";

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    return permissionGranted;
  } catch (error) {
    console.error("Failed to request notification permission:", error);
    return false;
  }
}

interface NotificationOptions {
  title: string;
  body: string;
  sessionId: string;
}

export async function sendNotification({ title, body }: NotificationOptions): Promise<void> {
  try {
    const permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      return;
    }

    tauriSendNotification({ title, body });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

// Check if a process name is a shell
export function isShellProcess(name: string): boolean {
  const shellNames = ["zsh", "bash", "sh", "fish", "tcsh", "csh", "ksh", "dash"];
  return shellNames.includes(name.toLowerCase());
}
