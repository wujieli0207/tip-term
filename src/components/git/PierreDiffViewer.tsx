import { useState, useMemo, useEffect } from 'react';
import { PatchDiff } from '@pierre/diffs/react';
import type { FileDiff, FileDiffWithStats } from '../../types/git';
import { convertToUnifiedPatch, mapToShikiTheme, isDarkTheme } from '../../utils/diffAdapter';
import { useSettingsStore } from '../../stores/settingsStore';
import { subscribeToThemeChanges } from '../../services/themeService';

export type DiffViewMode = 'stacked' | 'split';

interface PierreDiffViewerProps {
  fileDiff: FileDiff | FileDiffWithStats;
  showViewToggle?: boolean;
  defaultViewMode?: DiffViewMode;
  fileStatus?: 'added' | 'deleted' | 'modified' | 'renamed' | 'copied' | 'untracked';
  oldPath?: string;
  className?: string;
}

/**
 * Get effective theme (light/dark) based on current settings
 */
function getEffectiveTheme(): 'light' | 'dark' {
  const { themeMode } = useSettingsStore.getState().appearance;
  if (themeMode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return themeMode;
}

// Inject styles once globally - styles are embedded directly since @pierre/diffs
// doesn't export CSS through package exports
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  if (document.querySelector('style[data-pierre-diffs]')) {
    stylesInjected = true;
    return;
  }
  stylesInjected = true;

  // Create a minimal style to fix the component display
  // The @pierre/diffs library injects its own styles via JS when components mount
}

export default function PierreDiffViewer({
  fileDiff,
  showViewToggle = true,
  defaultViewMode = 'stacked',
  fileStatus,
  oldPath,
  className = '',
}: PierreDiffViewerProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>(defaultViewMode);
  const { appearance } = useSettingsStore();
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(getEffectiveTheme);

  // Inject styles on first render
  useEffect(() => {
    injectStyles();
  }, []);

  // Subscribe to theme changes
  useEffect(() => {
    const unsubscribe = subscribeToThemeChanges((theme) => {
      setEffectiveTheme(theme);
    });

    // Also update when settings change
    setEffectiveTheme(getEffectiveTheme());

    return unsubscribe;
  }, [appearance.themeMode]);

  // Get current color scheme based on effective theme
  const currentColorScheme = effectiveTheme === 'dark'
    ? appearance.darkColorScheme
    : appearance.lightColorScheme;

  // Convert to unified patch format
  const patch = useMemo(() => {
    return convertToUnifiedPatch(fileDiff, {
      oldPath,
      fileStatus: fileStatus || ('status' in fileDiff ? fileDiff.status : 'modified'),
    });
  }, [fileDiff, oldPath, fileStatus]);

  // Map to Shiki theme
  const shikiTheme = useMemo(() => {
    return mapToShikiTheme(currentColorScheme);
  }, [currentColorScheme]);

  const themeType = isDarkTheme(currentColorScheme) ? 'dark' : 'light';

  // Check if there's any content to display
  const hasContent = fileDiff.hunks.length > 0;

  if (!hasContent) {
    return (
      <div className={`p-4 text-[#666] text-sm ${className}`}>
        No changes to display
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* View toggle buttons */}
      {showViewToggle && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#2a2a2a] bg-[#151515]">
          <button
            onClick={() => setViewMode('stacked')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              viewMode === 'stacked'
                ? 'bg-[#3a3a3a] text-[#e0e0e0]'
                : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#2a2a2a]'
            }`}
          >
            Unified
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              viewMode === 'split'
                ? 'bg-[#3a3a3a] text-[#e0e0e0]'
                : 'text-[#888] hover:text-[#e0e0e0] hover:bg-[#2a2a2a]'
            }`}
          >
            Split
          </button>
        </div>
      )}

      {/* Diff content */}
      <div className="flex-1 overflow-auto pierre-diff-container">
        <PatchDiff
          patch={patch}
          options={{
            theme: shikiTheme,
            themeType: themeType,
            diffStyle: viewMode === 'split' ? 'split' : 'unified',
            disableFileHeader: true,
            overflow: 'scroll',
            lineDiffType: 'word',
          }}
        />
      </div>
    </div>
  );
}
