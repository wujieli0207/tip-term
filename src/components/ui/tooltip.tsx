import { ReactNode, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactNode;
  placement?: 'top' | 'bottom';
}

/**
 * Simple tooltip component using Portal to render outside parent containers
 * Shows tooltip above or below the content on hover
 */
export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [align, setAlign] = useState<'center' | 'left' | 'right'>('center');
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
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
      const centerX = rect.left + rect.width / 2;
      
      // Estimate tooltip width (actual width will be checked after render)
      const estimatedTooltipWidth = content.length * 7 + 16; // rough estimate
      const padding = 8;
      
      // Determine alignment based on available space
      let newAlign: 'center' | 'left' | 'right' = 'center';
      if (centerX - estimatedTooltipWidth / 2 < padding) {
        // Too close to left edge, align left
        newAlign = 'left';
      } else if (centerX + estimatedTooltipWidth / 2 > window.innerWidth - padding) {
        // Too close to right edge, align right
        newAlign = 'right';
      }
      
      setAlign(newAlign);
      setPosition({
        x: rect.left + rect.width / 2,
        y: placement === 'bottom' ? rect.bottom : rect.top,
      });
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Calculate transform based on alignment
  const getTransform = () => {
    const verticalTransform = placement === 'bottom' ? '0' : '-100%';
    if (align === 'left') return `translate(0, ${verticalTransform})`;
    if (align === 'right') return `translate(-100%, ${verticalTransform})`;
    return `translate(-50%, ${verticalTransform})`;
  };

  // Calculate arrow position based on alignment
  const getArrowClass = () => {
    if (align === 'left') return 'left-4';
    if (align === 'right') return 'right-4';
    return 'left-1/2 -translate-x-1/2';
  };

  const tooltipContent = isVisible ? (
    <div
      ref={tooltipRef}
      className="fixed px-2 py-1 bg-[#3a3a3a] text-gray-200 text-xs rounded whitespace-nowrap pointer-events-none z-[9999] border border-[#4a4a4a] shadow-lg"
      style={{
        left: `${position.x}px`,
        top: placement === 'bottom' ? `${position.y + 8}px` : `${position.y - 8}px`,
        transform: getTransform(),
      }}
    >
      {content}
      {placement === 'bottom' ? (
        <div
          className={`absolute ${getArrowClass()} bottom-full border-4 border-transparent border-b-[#3a3a3a]`}
          style={{ marginBottom: '-1px' }}
        />
      ) : (
        <div
          className={`absolute ${getArrowClass()} top-full border-4 border-transparent border-t-[#3a3a3a]`}
          style={{ marginTop: '-1px' }}
        />
      )}
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
