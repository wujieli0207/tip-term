import { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";

interface FileTreeContextMenuProps {
  children: ReactNode;
  filePath: string;
  rootPath: string;
}

export function FileTreeContextMenu({
  children,
  filePath,
  rootPath,
}: FileTreeContextMenuProps) {
  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(filePath);
    } catch (error) {
      console.error("Failed to copy path:", error);
    }
  };

  const handleCopyRelativePath = async () => {
    try {
      // Compute relative path
      let relativePath = filePath;
      if (filePath.startsWith(rootPath)) {
        relativePath = filePath.slice(rootPath.length);
        // Remove leading slash if present
        if (relativePath.startsWith("/")) {
          relativePath = relativePath.slice(1);
        }
      }
      await navigator.clipboard.writeText(relativePath);
    } catch (error) {
      console.error("Failed to copy relative path:", error);
    }
  };

  const handleRevealInFinder = async () => {
    try {
      await invoke("reveal_in_finder", { path: filePath });
    } catch (error) {
      console.error("Failed to reveal in Finder:", error);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuPrimitive.Trigger asChild>
        {children}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuContent className="w-56 bg-[hsl(var(--bg-card))] border-[hsl(var(--border))] shadow-lg">
        <ContextMenuItem
          onClick={handleCopyPath}
          className="text-[hsl(var(--text-secondary))] focus:bg-[hsl(var(--bg-hover))] focus:text-[hsl(var(--text-primary))] cursor-pointer"
        >
          Copy Path
          <ContextMenuShortcut className="text-[hsl(var(--text-muted))]">⌥⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleCopyRelativePath}
          className="text-[hsl(var(--text-secondary))] focus:bg-[hsl(var(--bg-hover))] focus:text-[hsl(var(--text-primary))] cursor-pointer"
        >
          Copy Relative Path
          <ContextMenuShortcut className="text-[hsl(var(--text-muted))]">⌥⇧⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[hsl(var(--border))]" />
        <ContextMenuItem
          onClick={handleRevealInFinder}
          className="text-[hsl(var(--text-secondary))] focus:bg-[hsl(var(--bg-hover))] focus:text-[hsl(var(--text-primary))] cursor-pointer"
        >
          Reveal in Finder
          <ContextMenuShortcut className="text-[hsl(var(--text-muted))]">⌥⌘R</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
