/**
 * Generate a consistent color class for a file/folder path
 * Uses a simple hash function to rotate through accent colors
 */
export function getIconColor(path: string): string {
  const colors = ['text-accent-orange', 'text-accent-cyan', 'text-accent-green'];
  const hash = hashCode(path);
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Simple hash function for strings
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}
