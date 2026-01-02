/**
 * Leaderboards page - Unified Stats + Awards page
 * Design: 3 tabs - Hall of Fame, Live Stats, All Players
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { useStats } from '../hooks/useStats';
import { useAwards, useAwardYears } from '../hooks/useAwards';
import { YearSelector } from '../components/stats/YearSelector';
import { LeaderboardsTabs, defaultLeaderboardTabs } from '../components/leaderboards/LeaderboardsTabs';
import { HallOfFameTab } from '../components/leaderboards/HallOfFameTab';
import { LiveStatsTab } from '../components/leaderboards/LiveStatsTab';
import { AllPlayersTab } from '../components/leaderboards/AllPlayersTab';
import { Tooltip } from '../components/ui/Tooltip';

export default function Leaderboards() {
  // State for year selection
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Fetch data from both hooks
  const stats = useStats(selectedYear === 'all' ? undefined : selectedYear, availableYears);
  const { awardsByCategory, loading: awardsLoading } = useAwards(selectedYear);
  const { years: awardYears } = useAwardYears();

  // Combine years from both stats and awards
  const combinedYears = useMemo(() => {
    const allYears = [...new Set([...availableYears, ...awardYears])];
    return allYears.sort((a, b) => b - a);
  }, [availableYears, awardYears]);

  // Handler for year selection changes
  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  // Loading state
  if (stats.loading && awardsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Error state
  if (stats.error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <p>Error loading stats: {stats.error}</p>
        </div>
      </div>
    );
  }

  const yearLabel = selectedYear === 'all' ? 'All-Time' : selectedYear;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with title and year selector */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">WNF Leaderboards</h1>
        </div>

        <div className="flex justify-center items-center gap-2 mb-4">
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            onYearsLoaded={setAvailableYears}
          />

          <Tooltip content="Filter stats by year or view all-time statistics">
            <span className="cursor-help text-info">i</span>
          </Tooltip>
        </div>

        {/* Current filter badge */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="badge badge-primary badge-lg gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-content animate-pulse" />
            {yearLabel}
          </div>
        </motion.div>
      </motion.div>

      {/* Tabs */}
      <LeaderboardsTabs tabs={defaultLeaderboardTabs}>
        <HallOfFameTab
          awardsByCategory={awardsByCategory}
          loading={awardsLoading}
        />
        <LiveStatsTab
          stats={stats}
          selectedYear={selectedYear}
        />
        <AllPlayersTab
          selectedYear={selectedYear}
        />
      </LeaderboardsTabs>
    </div>
  );
}
