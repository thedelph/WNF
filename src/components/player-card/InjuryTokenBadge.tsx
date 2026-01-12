import React from 'react';
import { Tooltip } from '../ui/Tooltip';

interface InjuryTokenBadgeProps {
  /** Whether the player is injured */
  isActive: boolean;
  /** The streak value they'll return with */
  returnStreak?: number | null;
  /** Original streak before injury */
  originalStreak?: number | null;
  /** Show compact version (just emoji) */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Badge component to show injury token status on player cards and lists
 */
export const InjuryTokenBadge: React.FC<InjuryTokenBadgeProps> = ({
  isActive,
  returnStreak,
  originalStreak,
  compact = false,
  className = '',
}) => {
  if (!isActive) return null;

  const tooltipContent = originalStreak != null && returnStreak != null
    ? `Injured. Returns at ${returnStreak}-game streak (was ${originalStreak})`
    : 'Injured';

  if (compact) {
    return (
      <Tooltip content={tooltipContent}>
        <span className={`text-amber-400 ${className}`}>🩹</span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={tooltipContent}>
      <div className={`badge badge-warning gap-1 ${className}`}>
        <span>🩹</span>
        <span className="hidden sm:inline">Injured</span>
      </div>
    </Tooltip>
  );
};

export default InjuryTokenBadge;
