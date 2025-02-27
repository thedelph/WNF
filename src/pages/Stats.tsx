import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Medal, 
  Star, 
  TrendingUp, 
  Timer, 
  Crown, 
  Percent, 
  Users, 
  ShirtIcon,
  Flame,
  Heart
} from 'lucide-react';
import { StatsCard } from '../components/stats/StatsCard';
import { AwardCard } from '../components/stats/AwardCard';
import { YearSelector } from '../components/stats/YearSelector';
import { HighestXPCard } from '../components/stats/HighestXPCard';
import { useStats } from '../hooks/useStats';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Stats() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  const stats = useStats(selectedYear === 'all' ? undefined : selectedYear, availableYears);

  const handleYearChange = (year: number | 'all') => {
    setSelectedYear(year);
  };

  if (stats.loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className="alert alert-error">
        <p>Error loading stats: {stats.error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold mb-4">WNF Stats</h1>
        <YearSelector
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          onYearsLoaded={setAvailableYears}
        />
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {/* Highest XP Records */}
        <HighestXPCard selectedYear={selectedYear} />

        {/* Lucky Bib Colour */}
        <StatsCard
          title="Lucky Bib Colour"
          value={stats.luckyBibColor.color.toUpperCase()}
          description={`${stats.luckyBibColor.winRate.toFixed(1)}% Win Rate`}
          color={stats.luckyBibColor.color as 'blue' | 'orange'}
          icon={<ShirtIcon className="w-6 h-6" />}
        />

        {/* Top All-Time Streaks */}
        <AwardCard
          title="Longest Attendance Streaks"
          winners={stats.topAttendanceStreaks.map(player => ({
            name: player.friendlyName,
            value: `${player.maxStreak} games`,
            id: player.id
          }))}
          icon={<Crown className="w-6 h-6" />}
          color="purple"
        />

        {/* Current Streaks - Only show for current year or all time */}
        {(selectedYear === 'all' || selectedYear === new Date().getFullYear()) && (
          <AwardCard
            title="Current Attendance Streaks"
            winners={stats.currentStreaks.map(player => ({
              name: player.friendlyName,
              value: `${player.currentStreak} games`,
              id: player.id
            }))}
            icon={<Flame className="w-6 h-6" />}
            color="green"
          />
        )}

        {/* Most Caps */}
        <AwardCard
          title="Most Caps"
          winners={stats.mostCaps.map(player => ({
            name: player.friendlyName,
            value: `${player.caps} games`,
            id: player.id
          }))}
          icon={<Trophy className="w-6 h-6" />}
          color="indigo"
        />

        {/* Best Win Rates */}
        <StatsCard
          title="Best Win Rates"
          stats={stats.bestWinRates}
          icon={<Percent className="w-6 h-6" />}
          description="Stats based on games with known outcomes and even teams only"
          color="teal"
        />

        {/* Best Buddies */}
        <AwardCard
          title="Best Buddies"
          winners={stats.bestBuddies.map(buddy => ({
            id: `${buddy.id}-${buddy.buddyId}`,
            name: `${buddy.friendlyName} & ${buddy.buddyFriendlyName}`,
            value: `${buddy.gamesTogether} games`
          }))}
          icon={<Heart className="w-6 h-6" />}
          color="pink"
          description="Players who have been on the same team most often"
        />

        {/* Team Color Frequency - Blue */}
        <AwardCard
          title="Blue Team Specialists"
          winners={stats.teamColorFrequency.blue.map(player => ({
            name: player.friendlyName,
            value: `${(player.teamFrequency * 100).toFixed(1)}%`,
            id: player.id
          }))}
          description="Players with 10+ caps who play most often on blue team"
          icon={<Star className="w-6 h-6" />}
          color="blue"
        />

        {/* Team Color Frequency - Orange */}
        <AwardCard
          title="Orange Team Specialists"
          winners={stats.teamColorFrequency.orange.map(player => ({
            name: player.friendlyName,
            value: `${(player.teamFrequency * 100).toFixed(1)}%`,
            id: player.id
          }))}
          description="Players with 10+ caps who play most often on orange team"
          icon={<Star className="w-6 h-6" />}
          color="orange"
        />
      </motion.div>
    </div>
  );
}
