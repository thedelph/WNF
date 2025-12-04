import { motion } from 'framer-motion';
import { fifaAnimations } from '../../constants/fifaTheme';
import { FIFAYearSelector } from './FIFAYearSelector';

interface FIFAHeaderProps {
  title: string;
  subtitle?: string;
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  availableYears: number[];
}

export const FIFAHeader = ({
  title,
  subtitle,
  selectedYear,
  onYearChange,
  availableYears,
}: FIFAHeaderProps) => {
  return (
    <motion.div
      className="text-center mb-10 relative z-10"
      variants={fifaAnimations.fadeInUp}
      initial="hidden"
      animate="visible"
    >
      {/* Main Title */}
      <h1 className="font-fifa-display text-5xl md:text-7xl font-bold tracking-wider mb-2">
        <span className="text-gradient-electric">{title}</span>
      </h1>

      {/* Subtitle */}
      {subtitle && (
        <p className="font-fifa-body text-lg text-fifa-electric/60 mb-6">
          {subtitle}
        </p>
      )}

      {/* Decorative line */}
      <motion.div
        className="w-32 h-1 bg-gradient-to-r from-transparent via-fifa-electric to-transparent mx-auto mb-6"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      />

      {/* Year Selector */}
      <FIFAYearSelector
        selectedYear={selectedYear}
        onYearChange={onYearChange}
        availableYears={availableYears}
      />
    </motion.div>
  );
};
