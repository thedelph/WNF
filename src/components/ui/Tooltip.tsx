import { ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

/**
 * A reusable tooltip component built on top of Radix UI's Tooltip primitive.
 * Provides a small popup with additional information when hovering over an element.
 * 
 * @param children - The element that triggers the tooltip
 * @param content - The text content to display in the tooltip
 * @param side - The preferred side of the trigger to render the tooltip
 * @param align - The preferred alignment against the trigger
 */
export const Tooltip = ({ 
  children, 
  content,
  side = 'top',
  align = 'center'
}: TooltipProps) => {
  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span className="touch-manipulation">
            {children}
          </span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="z-50 overflow-hidden rounded-md bg-base-300 px-3 py-1.5 text-sm text-base-content animate-in fade-in-0 zoom-in-95 touch-none"
            side={side}
            align={align}
            sideOffset={5}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-base-300" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};
