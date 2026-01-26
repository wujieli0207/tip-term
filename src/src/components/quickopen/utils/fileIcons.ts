const FILE_ICON_MAP: Record<string, string> = {
  ts: "📘",
  tsx: "📘",
  js: "📒",
  jsx: "📒",
  json: "📋",
  md: "📝",
  css: "🎨",
  scss: "🎨",
  html: "🌐",
  rs: "🦀",
  py: "🐍",
  go: "🔵",
  toml: "⚙️",
  yaml: "⚙️",
  yml: "⚙️",
  lock: "🔒",
  gitignore: "📁",
};

export function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return FILE_ICON_MAP[ext] || "📄";
}
