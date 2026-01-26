'use client';

import { ReactNode, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  position?: 'top' | 'bottom';
  maxWidth?: number;
}

export function Tooltip({
  content,
  children,
  className = '',
  position = 'top',
  maxWidth = 320,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!triggerRef.current) return;

    // Set initial position estimate based on trigger
    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedTop = position === 'top' ? rect.top - 80 : rect.bottom + 12;
    const estimatedLeft = rect.left + rect.width / 2 - 150;

    setCoords({ top: estimatedTop, left: Math.max(8, estimatedLeft) });
    setActualPosition(position);
    setIsVisible(true);

    // Refine position after tooltip renders
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        // Determine if we need to flip position
        let finalPosition = position;
        if (position === 'top' && triggerRect.top - tooltipRect.height - 12 < 0) {
          finalPosition = 'bottom';
        } else if (position === 'bottom' && triggerRect.bottom + tooltipRect.height + 12 > window.innerHeight) {
          finalPosition = 'top';
        }

        let top: number;
        if (finalPosition === 'top') {
          top = triggerRect.top - tooltipRect.height - 12;
        } else {
          top = triggerRect.bottom + 12;
        }

        // Center horizontally, but keep on screen
        let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));

        setActualPosition(finalPosition);
        setCoords({ top, left });
      });
    });
  }, [position]);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  if (!content) {
    return <>{children}</>;
  }

  const canRenderPortal = typeof document !== 'undefined';

  const tooltipElement = isVisible ? (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] pointer-events-none"
      style={{
        top: coords.top,
        left: coords.left,
        maxWidth,
        minWidth: 200,
      }}
    >
      <div
        className="
          rounded-xl overflow-hidden
          border-2 border-accent-500
          shadow-2xl
        "
        style={{
          backgroundColor: '#2c2c2e',
        }}
      >
        <div className="px-4 py-3 text-sm text-white leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
      {/* Arrow */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2
          ${actualPosition === 'top' ? 'bottom-0 translate-y-full' : 'top-0 -translate-y-full'}
        `}
      >
        <div
          className={`
            w-0 h-0 border-[10px] border-transparent
            ${actualPosition === 'top'
              ? 'border-t-accent-500'
              : 'border-b-accent-500'
            }
          `}
        />
        <div
          className={`
            absolute left-1/2 -translate-x-1/2
            w-0 h-0 border-[8px] border-transparent
            ${actualPosition === 'top'
              ? '-top-[12px] border-t-[#2c2c2e]'
              : '-bottom-[12px] border-b-[#2c2c2e]'
            }
          `}
        />
      </div>
    </div>
  ) : null;

  return (
    <span
      ref={triggerRef}
      className={`inline-flex cursor-help ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {canRenderPortal && tooltipElement && createPortal(tooltipElement, document.body)}
    </span>
  );
}

/**
 * A badge with an integrated tooltip - for modifier badges, keywords, etc.
 */
interface TooltipBadgeProps {
  children: ReactNode;
  tooltip: ReactNode;
  variant?: 'accent' | 'purple' | 'default';
  className?: string;
}

export function TooltipBadge({
  children,
  tooltip,
  variant = 'accent',
  className = '',
}: TooltipBadgeProps) {
  const variantClass = {
    default: 'bg-white/10 text-white/60',
    accent: 'badge-accent',
    purple: 'badge-purple',
  }[variant];

  return (
    <Tooltip content={tooltip}>
      <span className={`badge ${variantClass} ${className}`}>
        {children}
      </span>
    </Tooltip>
  );
}
