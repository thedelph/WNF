/**
 * AwardMedal component - displays emoji medals matching site style
 * Design: Simple, readable emoji medals consistent with AwardCard.tsx
 */

import { motion } from 'framer-motion';
import { MedalType } from '../../types/awards';

interface AwardMedalProps {
  type: MedalType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

const medals: Record<MedalType, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
};

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-6xl',
};

export const AwardMedal = ({
  type,
  size = 'md',
  className = '',
  animate = true,
}: AwardMedalProps) => {
  const medal = medals[type];
  const sizeClass = sizeClasses[size];

  if (!animate) {
    return (
      <span className={`${sizeClass} ${className}`} role="img" aria-label={`${type} medal`}>
        {medal}
      </span>
    );
  }

  return (
    <motion.span
      className={`${sizeClass} ${className} inline-block`}
      whileHover={{ scale: 1.15, rotate: [0, -10, 10, 0] }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      role="img"
      aria-label={`${type} medal`}
    >
      {medal}
    </motion.span>
  );
};

export default AwardMedal;
