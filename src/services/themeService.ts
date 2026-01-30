import type { ThemeMode, TerminalColorScheme } from '../types/theme';
import { getColorSchemeById, DEFAULT_DARK_SCHEME } from '../config/defaultColorSchemes';
import { toXtermTheme } from '../types/theme';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * Theme change listener callback type
 */
export type ThemeChangeListener = (theme: 'light' | 'dark') => void;

/**
 * Get system theme using window.matchMedia
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Theme service for managing application themes
 */
class ThemeService {
  private currentTheme: 'light' | 'dark' = 'dark';
  private listeners: Set<ThemeChangeListener> = new Set();
  private mediaQueryListener: ((event: MediaQueryListEvent) => void) | null = null;

  /**
   * Initialize the theme service
   */
  async init(): Promise<void> {
    // Get initial system theme
    this.currentTheme = getSystemTheme();

    // Listen for system theme changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQueryListener = (event: MediaQueryListEvent) => {
        this.handleSystemThemeChange(event.matches ? 'dark' : 'light');
      };
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', this.mediaQueryListener);
    }

    // Apply initial theme based on settings
    this.applyThemeFromSettings();
  }

  /**
   * Handle system theme change
   */
  private handleSystemThemeChange(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;
    const { themeMode } = useSettingsStore.getState().appearance;
    if (themeMode === 'auto') {
      this.setAppTheme(theme);
    }
  }

  /**
   * Apply theme based on current settings
   */
  applyThemeFromSettings(): void {
    const { themeMode } = useSettingsStore.getState().appearance;
    this.applyThemeMode(themeMode);
  }

  /**
   * Apply theme mode (light, dark, auto)
   */
  applyThemeMode(mode: ThemeMode): void {
    if (mode === 'auto') {
      // Use system theme
      if (this.currentTheme) {
        this.setAppTheme(this.currentTheme);
      }
    } else {
      this.setAppTheme(mode);
    }
  }

  /**
   * Set the application theme
   */
  private setAppTheme(theme: 'light' | 'dark'): void {
    // Update document data attribute for CSS variables
    document.documentElement.dataset.theme = theme;

    // Notify listeners
    this.listeners.forEach((listener) => listener(theme));
  }

  /**
   * Get the current active color scheme
   */
  getActiveColorScheme(): TerminalColorScheme {
    const { themeMode, darkColorScheme, lightColorScheme } = useSettingsStore.getState().appearance;

    let schemeId: string;
    if (themeMode === 'auto') {
      schemeId = this.currentTheme === 'light' ? lightColorScheme : darkColorScheme;
    } else {
      schemeId = themeMode === 'light' ? lightColorScheme : darkColorScheme;
    }

    const scheme = getColorSchemeById(schemeId);
    return scheme || getColorSchemeById(DEFAULT_DARK_SCHEME)!;
  }

  /**
   * Get the xterm.js theme for the active color scheme
   */
  getTerminalTheme() {
    const scheme = this.getActiveColorScheme();
    return toXtermTheme(scheme);
  }

  /**
   * Get color scheme by ID
   */
  getColorScheme(id: string): TerminalColorScheme | undefined {
    return getColorSchemeById(id);
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: ThemeChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get the current theme mode
   */
  getCurrentThemeMode(): ThemeMode {
    return useSettingsStore.getState().appearance.themeMode;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.mediaQueryListener && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
    this.listeners.clear();
  }
}

// Singleton instance
let themeServiceInstance: ThemeService | null = null;

/**
 * Get the theme service singleton instance
 */
export function getThemeService(): ThemeService {
  if (!themeServiceInstance) {
    themeServiceInstance = new ThemeService();
  }
  return themeServiceInstance;
}

/**
 * Get the current terminal theme (convenience function)
 */
export function getTerminalTheme() {
  return getThemeService().getTerminalTheme();
}

/**
 * Apply theme from settings (convenience function)
 */
export function applyThemeFromSettings(): void {
  getThemeService().applyThemeFromSettings();
}

/**
 * Subscribe to theme changes (convenience function)
 */
export function subscribeToThemeChanges(listener: ThemeChangeListener): () => void {
  return getThemeService().subscribe(listener);
}
