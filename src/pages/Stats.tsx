import { useState } from 'react';
import { motion } from 'framer-motion';
import { YearSelector } from '../components/stats/YearSelector';
import { useStats } from '../hooks/useStats';
import { StatsTabs, defaultStatsTabs } from '../components/stats/StatsTabs';
import { AttendanceStats } from '../components/stats/AttendanceStats';
import { PerformanceStats } from '../components/stats/PerformanceStats';
import { OtherStats } from '../components/stats/OtherStats';
import { ComprehensiveStatsTable } from '../components/stats/ComprehensiveStatsTable';

/**
 * Stats page component
 * 
 * Displays various statistics about WNF games and players organized into categories:
 * - Attendance: XP Leaderboard, Longest/Current Attendance Streaks, Most Caps
 * - Performance: Team Goal Differentials, Win Streaks, Unbeaten Streaks, Win Rates
 * - Other: Lucky Bib Color, Best Buddies, Team Color Specialists
 * 
 * Uses a tabbed interface to organize the stats into logical categories
 * and reduce visual clutter on the page.
 */
export default function Stats() {
  // State for year selection and filtering
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // Fetch stats data based on selected year
  const stats = useStats(selectedYear === 'all' ? undefined : selectedYear, availableYears);

  // Handler for year selection changes
  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  // Loading state
  if (stats.loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Error state
  if (stats.error) {
    return (
      <div className="alert alert-error">
        <p>Error loading stats: {stats.error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with title and year selector */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold mb-4">WNF Stats</h1>
        
        <div className="flex justify-center items-center gap-2">
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
            onYearsLoaded={setAvailableYears}
          />
        </div>
      </motion.div>

      {/* Tabbed interface for stats categories */}
      <StatsTabs tabs={defaultStatsTabs}>
        {/* Attendance Stats Tab */}
        <AttendanceStats 
          stats={stats} 
          selectedYear={selectedYear} 
        />
        
        {/* Performance Stats Tab */}
        <PerformanceStats 
          stats={stats} 
          selectedYear={selectedYear} 
        />
        
        {/* Other Stats Tab */}
        <OtherStats 
          stats={stats} 
        />
        
        {/* All Stats Tab - Comprehensive table with all player statistics */}
        <ComprehensiveStatsTable 
          selectedYear={selectedYear} 
        />
      </StatsTabs>
    </div>
  );
}
