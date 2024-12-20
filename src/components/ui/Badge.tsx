import React from 'react'
import { cn } from '../../utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'badge-primary' | 'badge-secondary' | 'badge-accent' | 'badge-ghost' | 'badge-info' | 'badge-success' | 'badge-warning' | 'badge-error' | 'badge-neutral'
  size?: 'badge-xs' | 'badge-sm' | 'badge-md' | 'badge-lg'
  outline?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'badge-primary',
  size = 'badge-md',
  outline = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'badge',
        variant,
        size,
        outline && 'badge-outline',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
