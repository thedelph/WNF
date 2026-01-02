/**
 * HallOfFameTab component - Displays 12 award categories with gradient cards
 * Design: Reuses AwardCategory component from awards system
 */

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { AwardsByCategory } from '../../types/awards';
import AwardCategory from '../awards/AwardCategory';

interface HallOfFameTabProps {
  awardsByCategory: AwardsByCategory[];
  loading: boolean;
}

export const HallOfFameTab = ({ awardsByCategory, loading }: HallOfFameTabProps) => {
  // Animation variants for container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="mt-4 text-base-content/60">Loading Hall of Fame...</p>
      </div>
    );
  }

  if (awardsByCategory.length === 0) {
    return (
      <motion.div
        className="text-center py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Trophy className="w-16 h-16 text-base-content/20 mx-auto mb-4" strokeWidth={1} />
        <p className="text-xl text-base-content/60">No awards found</p>
        <p className="text-sm text-base-content/40 mt-2">
          Awards will be revealed at the end of the season
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
    >
      {awardsByCategory.map((category, index) => (
        <AwardCategory
          key={category.category}
          category={category}
          index={index}
        />
      ))}
    </motion.div>
  );
};

export default HallOfFameTab;
