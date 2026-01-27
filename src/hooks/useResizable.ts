import { useEffect, useRef, useState } from "react";

interface UseResizableOptions {
  onResize: (width: number) => void;
  direction?: "left" | "right"; // Which edge the resize handle is on
}

export function useResizable({ onResize, direction = "left" }: UseResizableOptions) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        // For left-side panels (resize handle on right), calculate width from left edge
        // For right-side panels (resize handle on left), calculate width from right edge
        const newWidth = direction === "right"
          ? e.clientX - rect.left
          : rect.right - e.clientX;
        onResize(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, onResize, direction]);

  return { panelRef, isResizing, handleMouseDown };
}
