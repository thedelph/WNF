import { motion } from 'framer-motion';
import { Trophy, Crown, Flame } from 'lucide-react';
import { AwardCard } from './AwardCard';
import { HighestXPCard } from './HighestXPCard';
import { Stats, PlayerStats } from '../../hooks/useStats';

// Props interface for the AttendanceStats component
interface AttendanceStatsProps {
  stats: Stats;
  selectedYear: number | 'all';
}

/**
 * AttendanceStats component - Displays attendance-related statistics
 * 
 * Includes:
 * - XP Leaderboard
 * - Longest Attendance Streaks
 * - Current Attendance Streaks
 * - Most Caps
 * 
 * @param stats - The stats object from useStats hook
 * @param selectedYear - The currently selected year filter
 */
export const AttendanceStats = ({ stats, selectedYear }: AttendanceStatsProps) => {
  // Animation variants for container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {/* XP Leaderboard */}
      <HighestXPCard selectedYear={selectedYear} />

      {/* Longest Attendance Streaks */}
      <AwardCard
        title="Longest Attendance Streaks"
        winners={stats.topAttendanceStreaks.map((player: PlayerStats) => ({
          name: player.friendlyName,
          value: (
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
              <span className="font-bold text-right whitespace-nowrap w-20">{player.maxStreak} games</span>
              {player.maxAttendanceStreakDate && (
                <span className="text-xs opacity-80 text-right whitespace-nowrap w-24">
                  {new Intl.DateTimeFormat('en-GB', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  }).format(new Date(player.maxAttendanceStreakDate))}
                </span>
              )}
            </div>
          ),
          rawValue: player.maxStreak,
          id: player.id
        }))}
        icon={<Crown className="w-6 h-6" />}
        color="purple"
      />

      {/* Current Attendance Streaks - Only show for current year or all time */}
      {(selectedYear === 'all' || selectedYear === new Date().getFullYear()) && (
        <AwardCard
          title="Current Attendance Streaks"
          winners={stats.currentStreaks.map((player: PlayerStats) => ({
            name: player.friendlyName,
            value: (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                <span className="font-bold text-right whitespace-nowrap w-20">{player.currentStreak} games</span>
              </div>
            ),
            rawValue: player.currentStreak,
            id: player.id
          }))}
          icon={<Flame className="w-6 h-6" />}
          color="green"
        />
      )}

      {/* Most Caps */}
      <AwardCard
        title="Most Caps"
        winners={stats.mostCaps.map((player: PlayerStats) => ({
          name: player.friendlyName,
          value: `${player.caps} games`,
          id: player.id
        }))}
        icon={<Trophy className="w-6 h-6" />}
        color="indigo"
      />
    </motion.div>
  );
};
