import { ReactNode, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactNode;
}

/**
 * Simple tooltip component using Portal to render outside parent containers
 * Shows tooltip above the content on hover
 */
export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  // Create portal container if it doesn't exist
  useEffect(() => {
    if (!portalRef.current) {
      portalRef.current = document.createElement('div');
      portalRef.current.id = 'tooltip-portal';
      document.body.appendChild(portalRef.current);
    }
    return () => {
      if (portalRef.current && portalRef.current.parentNode) {
        portalRef.current.parentNode.removeChild(portalRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const tooltipContent = isVisible ? (
    <div
      className="fixed px-2 py-1 bg-[#3a3a3a] text-gray-200 text-xs rounded whitespace-nowrap pointer-events-none z-[9999] border border-[#4a4a4a] shadow-lg"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 8}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {content}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-[#3a3a3a]"
        style={{ marginTop: '-1px' }}
      />
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex"
      >
        {children}
      </div>
      {portalRef.current && createPortal(tooltipContent, portalRef.current)}
    </>
  );
}
