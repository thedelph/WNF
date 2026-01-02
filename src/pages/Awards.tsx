/**
 * Awards page - Hall of Fame displaying all award categories
 * Design: Clean layout with vibrant gradient cards matching site style
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, AlertCircle } from 'lucide-react';
import { useAwards, useAwardYears } from '../hooks/useAwards';
import { AwardYearFilter } from '../types/awards';
import AwardYearSelector from '../components/awards/AwardYearSelector';
import AwardCategory from '../components/awards/AwardCategory';

export default function Awards() {
  const [selectedYear, setSelectedYear] = useState<AwardYearFilter>('all');
  const { years: availableYears } = useAwardYears();
  const { awardsByCategory, loading, error } = useAwards(selectedYear);

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="mt-4 text-base-content/60">Loading awards...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error max-w-md mx-auto">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const yearLabel = selectedYear === 'all' ? 'All-Time' : selectedYear;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Hall of Fame</h1>
        </div>
        <p className="text-base-content/60">
          Wednesday Night Football Champions
        </p>
      </motion.div>

      {/* Year selector */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <AwardYearSelector
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          availableYears={availableYears}
        />
      </motion.div>

      {/* Current filter badge */}
      <motion.div
        className="flex justify-center mb-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="badge badge-primary badge-lg gap-2">
          <div className="w-2 h-2 rounded-full bg-primary-content animate-pulse" />
          {yearLabel} Champions
        </div>
      </motion.div>

      {/* Awards grid */}
      {awardsByCategory.length === 0 ? (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Trophy className="w-16 h-16 text-base-content/20 mx-auto mb-4" strokeWidth={1} />
          <p className="text-xl text-base-content/60">
            No awards found for {yearLabel}
          </p>
          <p className="text-sm text-base-content/40 mt-2">
            Awards will be revealed at the end of the season
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {awardsByCategory.map((category, index) => (
            <AwardCategory
              key={category.category}
              category={category}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
