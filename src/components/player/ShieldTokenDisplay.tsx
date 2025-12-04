import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShieldTokenDisplayProps {
  tokensAvailable: number;
  gamesTowardNextToken: number;
  gamesUntilNextToken: number;
  shieldActive: boolean;
  protectedStreakValue?: number | null; // Original streak value when shield was activated
  currentStreak?: number; // Current natural streak (for gradual decay display)
  /** @deprecated Use protectedStreakValue instead */
  frozenStreakValue?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showTooltip?: boolean;
}

/**
 * ShieldTokenDisplay component
 * Visual display of shield tokens (0-4 shield emojis)
 * Shows progress bar to next token
 * Shows active shield indicator with gradual decay info
 * @param tokensAvailable - Number of shield tokens available (0-4)
 * @param gamesTowardNextToken - Number of games played toward next token (0-9)
 * @param gamesUntilNextToken - Number of games until next token (1-10)
 * @param shieldActive - Whether shield is currently active
 * @param protectedStreakValue - The original streak value when shield was activated
 * @param currentStreak - Current natural streak for gradual decay display
 * @param size - Display size (sm, md, lg)
 * @param showProgress - Whether to show progress bar
 * @param showTooltip - Whether to show tooltip on hover
 */
export const ShieldTokenDisplay: React.FC<ShieldTokenDisplayProps> = ({
  tokensAvailable,
  gamesTowardNextToken,
  gamesUntilNextToken,
  shieldActive,
  protectedStreakValue,
  currentStreak = 0,
  frozenStreakValue, // Legacy prop
  size = 'md',
  showProgress = true,
  showTooltip = true
}) => {
  const maxTokens = 4;

  // Use protectedStreakValue, fall back to legacy frozenStreakValue
  const protectedValue = protectedStreakValue ?? frozenStreakValue ?? null;

  // Calculate gradual decay values
  const decayingProtectedBonus = shieldActive && protectedValue != null
    ? Math.max(0, protectedValue - currentStreak)
    : null;
  const effectiveStreak = shieldActive && protectedValue != null
    ? Math.max(currentStreak, protectedValue - currentStreak)
    : currentStreak;

  // Size-based styling
  const sizeClasses = {
    sm: {
      emoji: 'text-base',
      container: 'gap-0.5',
      progress: 'h-1',
      text: 'text-xs'
    },
    md: {
      emoji: 'text-xl',
      container: 'gap-1',
      progress: 'h-1.5',
      text: 'text-sm'
    },
    lg: {
      emoji: 'text-2xl',
      container: 'gap-2',
      progress: 'h-2',
      text: 'text-base'
    }
  };

  const styles = sizeClasses[size];

  // Tooltip content
  const tooltipContent = shieldActive && protectedValue
    ? `Shield Active: Streak ${currentStreak} | Protected ${decayingProtectedBonus} → +${effectiveStreak * 10}% XP`
    : tokensAvailable > 0
    ? `${tokensAvailable} Shield Token${tokensAvailable !== 1 ? 's' : ''} Available • Earn 1 per 10 games played`
    : `No Shield Tokens • ${gamesUntilNextToken} game${gamesUntilNextToken !== 1 ? 's' : ''} until next token`;

  // Progress percentage
  const progressPercentage = (gamesTowardNextToken / 10) * 100;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Shield Token Icons */}
      <div
        className={`flex items-center ${styles.container} ${showTooltip ? 'tooltip' : ''}`}
        data-tip={showTooltip ? tooltipContent : undefined}
      >
        <AnimatePresence mode="popLayout">
          {Array.from({ length: maxTokens }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: index < tokensAvailable ? 1 : 0.2,
                filter: index < tokensAvailable ? 'grayscale(0%)' : 'grayscale(100%)'
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: index * 0.05
              }}
              className={styles.emoji}
            >
              🛡️
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Active Shield Indicator */}
        {shieldActive && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="ml-1"
          >
            <span className="text-success text-lg">✓</span>
          </motion.div>
        )}
      </div>

      {/* Active Shield Badge - Shows both natural and protected values */}
      {shieldActive && protectedValue != null && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="badge badge-success badge-sm gap-1">
            <span>🛡️</span>
            <span className={styles.text}>
              Streak: {currentStreak} | Protected: {decayingProtectedBonus}
            </span>
          </div>
          <span className={`${styles.text} text-success font-semibold`}>
            +{effectiveStreak * 10}% XP
          </span>
        </motion.div>
      )}

      {/* Progress to Next Token */}
      {showProgress && tokensAvailable < maxTokens && !shieldActive && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between items-center mb-1">
            <span className={`${styles.text} text-base-content/70`}>
              Next Token
            </span>
            <span className={`${styles.text} font-semibold`}>
              {gamesTowardNextToken}/10 games
            </span>
          </div>

          {/* Progress Bar */}
          <div className={`relative w-full ${styles.progress} bg-base-300 rounded-full overflow-hidden`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-warning to-success"
            />
          </div>

          <div className={`${styles.text} text-center mt-1 text-base-content/60`}>
            {gamesUntilNextToken} game{gamesUntilNextToken !== 1 ? 's' : ''} until next shield
          </div>
        </div>
      )}

      {/* Max Tokens Reached */}
      {tokensAvailable >= maxTokens && !shieldActive && (
        <div className="badge badge-info badge-sm">
          <span className={styles.text}>Max shields reached</span>
        </div>
      )}
    </div>
  );
};

/**
 * Compact Shield Token Display
 * Shows only the token count with optional tooltip
 * Used in player cards and compact layouts
 */
export const ShieldTokenBadge: React.FC<{
  tokensAvailable: number;
  shieldActive?: boolean;
  size?: 'xs' | 'sm' | 'md';
}> = ({ tokensAvailable, shieldActive, size = 'sm' }) => {
  if (tokensAvailable === 0 && !shieldActive) return null;

  const sizeClass = {
    xs: 'badge-xs text-xs',
    sm: 'badge-sm text-sm',
    md: 'badge-md text-base'
  }[size];

  return (
    <div className={`badge ${shieldActive ? 'badge-success' : 'badge-warning'} ${sizeClass} gap-1`}>
      <span>🛡️</span>
      <span>{shieldActive ? 'Active' : tokensAvailable}</span>
    </div>
  );
};
