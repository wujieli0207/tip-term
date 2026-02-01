import type { FileDiff, FileDiffWithStats } from '../types/git';

/**
 * Check if a string is a valid unified diff hunk header
 */
function isValidHunkHeader(header: string): boolean {
  return /^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@/.test(header.trim());
}

/**
 * Generate a unified diff hunk header
 */
function generateHunkHeader(oldStart: number, oldCount: number, newStart: number, newCount: number): string {
  return `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`;
}

/**
 * Convert FileDiff or FileDiffWithStats to unified diff patch string format
 */
export function convertToUnifiedPatch(
  fileDiff: FileDiff | FileDiffWithStats,
  options?: {
    oldPath?: string;
    fileStatus?: 'added' | 'deleted' | 'modified' | 'renamed' | 'copied' | 'untracked';
  }
): string {
  const path = fileDiff.path;
  const oldPath = options?.oldPath || ('oldPath' in fileDiff ? fileDiff.oldPath : undefined) || path;
  const status = options?.fileStatus || ('status' in fileDiff ? fileDiff.status : 'modified');

  const lines: string[] = [];

  // Add file header
  if (status === 'added' || status === 'untracked') {
    lines.push(`--- /dev/null`);
    lines.push(`+++ b/${path}`);
  } else if (status === 'deleted') {
    lines.push(`--- a/${oldPath}`);
    lines.push(`+++ /dev/null`);
  } else if (status === 'renamed' && oldPath !== path) {
    lines.push(`--- a/${oldPath}`);
    lines.push(`+++ b/${path}`);
  } else {
    lines.push(`--- a/${oldPath}`);
    lines.push(`+++ b/${path}`);
  }

  // Add hunks
  for (const hunk of fileDiff.hunks) {
    // Check if hunk header is valid, if not generate one
    let header = hunk.header.trim();
    if (!isValidHunkHeader(header)) {
      // Generate a proper hunk header based on content
      const additionLines = hunk.lines.filter(l => l.origin === '+').length;
      const deletionLines = hunk.lines.filter(l => l.origin === '-').length;
      const contextLines = hunk.lines.filter(l => l.origin === ' ').length;

      if (status === 'added' || status === 'untracked') {
        // New file: all lines are additions
        header = generateHunkHeader(0, 0, 1, hunk.lines.length);
      } else if (status === 'deleted') {
        // Deleted file: all lines are deletions
        header = generateHunkHeader(1, hunk.lines.length, 0, 0);
      } else {
        // Modified file
        const oldCount = deletionLines + contextLines;
        const newCount = additionLines + contextLines;
        header = generateHunkHeader(1, oldCount, 1, newCount);
      }
    }

    lines.push(header);
    for (const line of hunk.lines) {
      // Ensure proper line format
      const content = line.content.endsWith('\n') ? line.content.slice(0, -1) : line.content;
      lines.push(`${line.origin}${content}`);
    }
  }

  return lines.join('\n');
}

/**
 * Detect programming language from file extension for syntax highlighting
 */
export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';

  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'mjs': 'javascript',
    'cjs': 'javascript',

    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'vue': 'vue',
    'svelte': 'svelte',

    // Data formats
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'toml': 'toml',

    // Shell
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'fish': 'fish',
    'ps1': 'powershell',

    // Backend
    'py': 'python',
    'rb': 'ruby',
    'php': 'php',
    'java': 'java',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'scala': 'scala',
    'go': 'go',
    'rs': 'rust',
    'c': 'c',
    'h': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'hpp': 'cpp',
    'hxx': 'cpp',
    'cs': 'csharp',
    'swift': 'swift',
    'dart': 'dart',
    'ex': 'elixir',
    'exs': 'elixir',
    'erl': 'erlang',
    'clj': 'clojure',
    'cljs': 'clojure',
    'hs': 'haskell',
    'lua': 'lua',
    'r': 'r',
    'R': 'r',
    'jl': 'julia',
    'pl': 'perl',
    'pm': 'perl',

    // Config
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'cmake': 'cmake',
    'gradle': 'groovy',

    // Markup
    'md': 'markdown',
    'mdx': 'mdx',
    'tex': 'latex',
    'rst': 'rst',

    // Database
    'sql': 'sql',
    'graphql': 'graphql',
    'gql': 'graphql',

    // Other
    'diff': 'diff',
    'patch': 'diff',
    'ini': 'ini',
    'conf': 'ini',
    'env': 'dotenv',
    'prisma': 'prisma',
    'proto': 'protobuf',
    'zig': 'zig',
    'nim': 'nim',
    'v': 'v',
    'wasm': 'wasm',
  };

  // Check for special filenames
  const fileName = filePath.split('/').pop()?.toLowerCase() || '';
  if (fileName === 'dockerfile' || fileName.startsWith('dockerfile.')) {
    return 'dockerfile';
  }
  if (fileName === 'makefile' || fileName === 'gnumakefile') {
    return 'makefile';
  }
  if (fileName === '.gitignore' || fileName === '.dockerignore') {
    return 'gitignore';
  }
  if (fileName === 'cargo.toml' || fileName === 'cargo.lock') {
    return 'toml';
  }
  if (fileName === 'package.json' || fileName === 'tsconfig.json') {
    return 'json';
  }

  return languageMap[ext] || 'text';
}

/**
 * Map TipTerm color scheme ID to Shiki theme name
 */
export function mapToShikiTheme(colorSchemeId: string): string {
  const themeMap: Record<string, string> = {
    // Dark themes
    'tabby-dark': 'github-dark',
    'dracula': 'dracula',
    'tokyo-night': 'tokyo-night',
    'solarized-dark': 'solarized-dark',
    'nord': 'nord',
    'one-dark': 'one-dark-pro',
    'monokai': 'monokai',
    'gruvbox-dark': 'vitesse-dark',
    'catppuccin-mocha': 'catppuccin-mocha',

    // Light themes
    'tabby-light': 'github-light',
    'solarized-light': 'solarized-light',
    'nord-light': 'nord',
  };

  return themeMap[colorSchemeId] || 'github-dark';
}

/**
 * Check if a color scheme is a dark theme
 */
export function isDarkTheme(colorSchemeId: string): boolean {
  const lightThemes = ['tabby-light', 'solarized-light', 'nord-light'];
  return !lightThemes.includes(colorSchemeId);
}
