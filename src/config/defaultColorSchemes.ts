import type { TerminalColorScheme } from '../types/theme';

/**
 * Predefined color schemes for TipTerm
 */

// Tabby Dark - Default dark theme (current TipTerm theme)
const tabbyDark: TerminalColorScheme = {
  name: 'Tabby Dark',
  id: 'tabby-dark',
  mode: 'dark',
  foreground: '#e5e5e5',
  background: '#0a0a0a',
  cursor: '#e5e5e5',
  cursorAccent: '#0a0a0a',
  selectionBackground: '#444444',
  colors: [
    '#000000', // black
    '#cd3131', // red
    '#0dbc79', // green
    '#e5e510', // yellow
    '#2472c8', // blue
    '#bc3fbc', // magenta
    '#11a8cd', // cyan
    '#e5e5e5', // white
    '#666666', // brightBlack
    '#f14c4c', // brightRed
    '#23d18b', // brightGreen
    '#f5f543', // brightYellow
    '#3b8eea', // brightBlue
    '#d670d6', // brightMagenta
    '#29b8db', // brightCyan
    '#ffffff', // brightWhite
  ],
};

// Dracula
const dracula: TerminalColorScheme = {
  name: 'Dracula',
  id: 'dracula',
  mode: 'dark',
  foreground: '#f8f8f2',
  background: '#282a36',
  cursor: '#f8f8f2',
  cursorAccent: '#282a36',
  selectionBackground: '#44475a',
  colors: [
    '#21222c', // black
    '#ff5555', // red
    '#50fa7b', // green
    '#f1fa8c', // yellow
    '#bd93f9', // blue
    '#ff79c6', // magenta
    '#8be9fd', // cyan
    '#f8f8f2', // white
    '#6272a4', // brightBlack
    '#ff6e6e', // brightRed
    '#69ff94', // brightGreen
    '#ffffa5', // brightYellow
    '#d6acff', // brightBlue
    '#ff92df', // brightMagenta
    '#a4ffff', // brightCyan
    '#ffffff', // brightWhite
  ],
};

// Tokyo Night
const tokyoNight: TerminalColorScheme = {
  name: 'Tokyo Night',
  id: 'tokyo-night',
  mode: 'dark',
  foreground: '#c0caf5',
  background: '#1a1b26',
  cursor: '#c0caf5',
  cursorAccent: '#1a1b26',
  selectionBackground: '#33467c',
  colors: [
    '#15161e', // black
    '#f7768e', // red
    '#9ece6a', // green
    '#e0af68', // yellow
    '#7aa2f7', // blue
    '#bb9af7', // magenta
    '#7dcfff', // cyan
    '#a9b1d6', // white
    '#414868', // brightBlack
    '#f7768e', // brightRed
    '#9ece6a', // brightGreen
    '#e0af68', // brightYellow
    '#7aa2f7', // brightBlue
    '#bb9af7', // brightMagenta
    '#7dcfff', // brightCyan
    '#c0caf5', // brightWhite
  ],
};

// Solarized Dark
const solarizedDark: TerminalColorScheme = {
  name: 'Solarized Dark',
  id: 'solarized-dark',
  mode: 'dark',
  foreground: '#839496',
  background: '#002b36',
  cursor: '#839496',
  cursorAccent: '#002b36',
  selectionBackground: '#073642',
  colors: [
    '#073642', // black
    '#dc322f', // red
    '#859900', // green
    '#b58900', // yellow
    '#268bd2', // blue
    '#d33682', // magenta
    '#2aa198', // cyan
    '#eee8d5', // white
    '#002b36', // brightBlack
    '#cb4b16', // brightRed
    '#586e75', // brightGreen
    '#657b83', // brightYellow
    '#839496', // brightBlue
    '#6c71c4', // brightMagenta
    '#93a1a1', // brightCyan
    '#fdf6e3', // brightWhite
  ],
};

// Nord
const nord: TerminalColorScheme = {
  name: 'Nord',
  id: 'nord',
  mode: 'dark',
  foreground: '#d8dee9',
  background: '#2e3440',
  cursor: '#d8dee9',
  cursorAccent: '#2e3440',
  selectionBackground: '#434c5e',
  colors: [
    '#3b4252', // black
    '#bf616a', // red
    '#a3be8c', // green
    '#ebcb8b', // yellow
    '#81a1c1', // blue
    '#b48ead', // magenta
    '#88c0d0', // cyan
    '#e5e9f0', // white
    '#4c566a', // brightBlack
    '#bf616a', // brightRed
    '#a3be8c', // brightGreen
    '#ebcb8b', // brightYellow
    '#81a1c1', // brightBlue
    '#b48ead', // brightMagenta
    '#8fbcbb', // brightCyan
    '#eceff4', // brightWhite
  ],
};

// One Dark
const oneDark: TerminalColorScheme = {
  name: 'One Dark',
  id: 'one-dark',
  mode: 'dark',
  foreground: '#abb2bf',
  background: '#282c34',
  cursor: '#abb2bf',
  cursorAccent: '#282c34',
  selectionBackground: '#3e4451',
  colors: [
    '#282c34', // black
    '#e06c75', // red
    '#98c379', // green
    '#e5c07b', // yellow
    '#61afef', // blue
    '#c678dd', // magenta
    '#56b6c2', // cyan
    '#abb2bf', // white
    '#5c6370', // brightBlack
    '#e06c75', // brightRed
    '#98c379', // brightGreen
    '#e5c07b', // brightYellow
    '#61afef', // brightBlue
    '#c678dd', // brightMagenta
    '#56b6c2', // brightCyan
    '#ffffff', // brightWhite
  ],
};

// Monokai
const monokai: TerminalColorScheme = {
  name: 'Monokai',
  id: 'monokai',
  mode: 'dark',
  foreground: '#f8f8f2',
  background: '#272822',
  cursor: '#f8f8f2',
  cursorAccent: '#272822',
  selectionBackground: '#49483e',
  colors: [
    '#272822', // black
    '#f92672', // red
    '#a6e22e', // green
    '#f4bf75', // yellow
    '#66d9ef', // blue
    '#ae81ff', // magenta
    '#a1efe4', // cyan
    '#f8f8f2', // white
    '#75715e', // brightBlack
    '#f92672', // brightRed
    '#a6e22e', // brightGreen
    '#f4bf75', // brightYellow
    '#66d9ef', // brightBlue
    '#ae81ff', // brightMagenta
    '#a1efe4', // brightCyan
    '#f9f8f5', // brightWhite
  ],
};

// Tabby Light
const tabbyLight: TerminalColorScheme = {
  name: 'Tabby Light',
  id: 'tabby-light',
  mode: 'light',
  foreground: '#333333',
  background: '#ffffff',
  cursor: '#333333',
  cursorAccent: '#ffffff',
  selectionBackground: '#b4d5fe',
  colors: [
    '#000000', // black
    '#cd3131', // red
    '#00bc00', // green
    '#949800', // yellow
    '#0451a5', // blue
    '#bc05bc', // magenta
    '#0598bc', // cyan
    '#555555', // white
    '#666666', // brightBlack
    '#cd3131', // brightRed
    '#14ce14', // brightGreen
    '#b5ba00', // brightYellow
    '#0451a5', // brightBlue
    '#bc05bc', // brightMagenta
    '#0598bc', // brightCyan
    '#ffffff', // brightWhite
  ],
};

// Solarized Light
const solarizedLight: TerminalColorScheme = {
  name: 'Solarized Light',
  id: 'solarized-light',
  mode: 'light',
  foreground: '#657b83',
  background: '#fdf6e3',
  cursor: '#657b83',
  cursorAccent: '#fdf6e3',
  selectionBackground: '#eee8d5',
  colors: [
    '#073642', // black
    '#dc322f', // red
    '#859900', // green
    '#b58900', // yellow
    '#268bd2', // blue
    '#d33682', // magenta
    '#2aa198', // cyan
    '#eee8d5', // white
    '#002b36', // brightBlack
    '#cb4b16', // brightRed
    '#586e75', // brightGreen
    '#657b83', // brightYellow
    '#839496', // brightBlue
    '#6c71c4', // brightMagenta
    '#93a1a1', // brightCyan
    '#fdf6e3', // brightWhite
  ],
};

// Nord Light
const nordLight: TerminalColorScheme = {
  name: 'Nord Light',
  id: 'nord-light',
  mode: 'light',
  foreground: '#2e3440',
  background: '#eceff4',
  cursor: '#2e3440',
  cursorAccent: '#eceff4',
  selectionBackground: '#d8dee9',
  colors: [
    '#3b4252', // black
    '#bf616a', // red
    '#a3be8c', // green
    '#ebcb8b', // yellow
    '#81a1c1', // blue
    '#b48ead', // magenta
    '#88c0d0', // cyan
    '#4c566a', // white
    '#5e81ac', // brightBlack
    '#bf616a', // brightRed
    '#a3be8c', // brightGreen
    '#ebcb8b', // brightYellow
    '#81a1c1', // brightBlue
    '#b48ead', // brightMagenta
    '#8fbcbb', // brightCyan
    '#2e3440', // brightWhite
  ],
};

// Gruvbox Dark
const gruvboxDark: TerminalColorScheme = {
  name: 'Gruvbox Dark',
  id: 'gruvbox-dark',
  mode: 'dark',
  foreground: '#ebdbb2',
  background: '#282828',
  cursor: '#ebdbb2',
  cursorAccent: '#282828',
  selectionBackground: '#3c3836',
  colors: [
    '#282828', // black
    '#cc241d', // red
    '#98971a', // green
    '#d79921', // yellow
    '#458588', // blue
    '#b16286', // magenta
    '#689d6a', // cyan
    '#a89984', // white
    '#928374', // brightBlack
    '#fb4934', // brightRed
    '#b8bb26', // brightGreen
    '#fabd2f', // brightYellow
    '#83a598', // brightBlue
    '#d3869b', // brightMagenta
    '#8ec07c', // brightCyan
    '#ebdbb2', // brightWhite
  ],
};

// Catppuccin Mocha
const catppuccinMocha: TerminalColorScheme = {
  name: 'Catppuccin Mocha',
  id: 'catppuccin-mocha',
  mode: 'dark',
  foreground: '#cdd6f4',
  background: '#1e1e2e',
  cursor: '#cdd6f4',
  cursorAccent: '#1e1e2e',
  selectionBackground: '#45475a',
  colors: [
    '#45475a', // black
    '#f38ba8', // red
    '#a6e3a1', // green
    '#f9e2af', // yellow
    '#89b4fa', // blue
    '#f5c2e7', // magenta
    '#94e2d5', // cyan
    '#bac2de', // white
    '#585b70', // brightBlack
    '#f38ba8', // brightRed
    '#a6e3a1', // brightGreen
    '#f9e2af', // brightYellow
    '#89b4fa', // brightBlue
    '#f5c2e7', // brightMagenta
    '#94e2d5', // brightCyan
    '#a6adc8', // brightWhite
  ],
};

export const DEFAULT_COLOR_SCHEMES: TerminalColorScheme[] = [
  tabbyDark,
  dracula,
  tokyoNight,
  solarizedDark,
  nord,
  oneDark,
  monokai,
  gruvboxDark,
  catppuccinMocha,
  tabbyLight,
  solarizedLight,
  nordLight,
];

export const DEFAULT_DARK_SCHEME = 'tabby-dark';
export const DEFAULT_LIGHT_SCHEME = 'tabby-light';

export function getColorSchemeById(id: string): TerminalColorScheme | undefined {
  return DEFAULT_COLOR_SCHEMES.find((scheme) => scheme.id === id);
}

export function getColorSchemesByMode(mode: 'light' | 'dark'): TerminalColorScheme[] {
  return DEFAULT_COLOR_SCHEMES.filter((scheme) => scheme.mode === mode);
}
