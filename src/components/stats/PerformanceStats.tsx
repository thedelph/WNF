import { motion } from 'framer-motion';
import { Award, Percent, TrendingUp, Shield, TrendingDown, XCircle } from 'lucide-react';
import { AwardCard } from './AwardCard';
import { StatsCard } from './StatsCard';
import { GoalDifferentialsCard } from './GoalDifferentialsCard';
import { Stats, PlayerStats } from '../../hooks/useStats';

// Props interface for the PerformanceStats component
interface PerformanceStatsProps {
  stats: Stats;
  selectedYear: number | 'all';
}

/**
 * PerformanceStats component - Displays performance-related statistics
 * 
 * Includes:
 * - Team Goal Differentials
 * - Longest Win Streaks
 * - Current Win Streaks
 * - Longest Unbeaten Streaks
 * - Current Unbeaten Streaks
 * - Best Win Rates
 * 
 * @param stats - The stats object from useStats hook
 * @param selectedYear - The currently selected year filter
 */
export const PerformanceStats = ({ stats, selectedYear }: PerformanceStatsProps) => {
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
      {/* Goal Differential Stats */}
      <GoalDifferentialsCard goalDifferentials={stats.goalDifferentials} />

      {/* Top All-Time Winning Streaks */}
      <AwardCard
        title="Longest Win Streaks"
        winners={stats.topWinStreaks
          // Sort by maxWinStreak in descending order to ensure correct medal assignment
          .sort((a, b) => (b?.maxWinStreak || 0) - (a?.maxWinStreak || 0))
          .map(player => {
            return {
              name: player?.friendlyName,
              value: (
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                  <span className="font-bold text-right whitespace-nowrap w-20">{player?.maxWinStreak} wins</span>
                  {player?.maxStreakDate && (
                    <span className="text-xs opacity-80 text-right whitespace-nowrap w-24">
                      {new Intl.DateTimeFormat('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      }).format(new Date(player?.maxStreakDate))}
                    </span>
                  )}
                </div>
              ),
              // Add the raw win streak value for medal calculation
              rawValue: player?.maxWinStreak,
              id: player?.id
            }
          })}
        icon={<Award className="w-6 h-6" />}
        color="green"
        description="Streaks that are broken by both losses and draws"
      />

      {/* Current Win Streaks - Only show for current year or all time */}
      {(selectedYear === 'all' || selectedYear === new Date().getFullYear()) && (
        <AwardCard
          title="Current Win Streaks"
          winners={stats.currentWinStreaks.map((player: PlayerStats) => ({
            name: player.friendlyName,
            value: (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                <span className="font-bold text-right whitespace-nowrap w-20">{player.currentWinStreak} wins</span>
              </div>
            ),
            rawValue: player.currentWinStreak,
            id: player.id
          }))}
          icon={<TrendingUp className="w-6 h-6" />}
          color="blue"
        />
      )}

      {/* Longest Unbeaten Streaks */}
      <AwardCard
        title="Longest Unbeaten Streaks"
        winners={stats.topUnbeatenStreaks
          .sort((a, b) => (b?.maxUnbeatenStreak || 0) - (a?.maxUnbeatenStreak || 0))
          .map(player => {
            return {
              name: player?.friendlyName,
              value: (
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                  <span className="font-bold text-right whitespace-nowrap w-20">{player?.maxUnbeatenStreak} games</span>
                  {player?.maxUnbeatenStreakDate && (
                    <span className="text-xs opacity-80 text-right whitespace-nowrap w-24">
                      {new Intl.DateTimeFormat('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      }).format(new Date(player?.maxUnbeatenStreakDate))}
                    </span>
                  )}
                </div>
              ),
              rawValue: player?.maxUnbeatenStreak,
              id: player?.id
            }
          })}
        icon={<Shield className="w-6 h-6" />}
        color="purple"
        description="Streaks that are only broken by losses (draws maintain the streak)"
      />

      {/* Current Unbeaten Streaks - Only show for current year or all time */}
      {(selectedYear === 'all' || selectedYear === new Date().getFullYear()) && (
        <AwardCard
          title="Current Unbeaten Streaks"
          winners={stats.currentUnbeatenStreaks.map((player: PlayerStats) => ({
            name: player.friendlyName,
            value: (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                <span className="font-bold text-right whitespace-nowrap w-20">{player.currentUnbeatenStreak} games</span>
              </div>
            ),
            rawValue: player.currentUnbeatenStreak,
            id: player.id
          }))}
          icon={<Shield className="w-6 h-6" />}
          color="indigo"
        />
      )}

      {/* Longest Loss Streaks */}
      <AwardCard
        title="Longest Loss Streaks"
        winners={stats.topLossStreaks
          .sort((a, b) => (b?.maxLossStreak || 0) - (a?.maxLossStreak || 0))
          .map(player => {
            return {
              name: player?.friendlyName,
              value: (
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                  <span className="font-bold text-right whitespace-nowrap w-20">{player?.maxLossStreak} losses</span>
                  {player?.maxLossStreakDate && (
                    <span className="text-xs opacity-80 text-right whitespace-nowrap w-24">
                      {new Intl.DateTimeFormat('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      }).format(new Date(player?.maxLossStreakDate))}
                    </span>
                  )}
                </div>
              ),
              rawValue: player?.maxLossStreak,
              id: player?.id
            }
          })}
        icon={<TrendingDown className="w-6 h-6" />}
        color="red"
        description="Consecutive losses (broken by wins or draws)"
      />

      {/* Current Loss Streaks - Only show for current year or all time */}
      {(selectedYear === 'all' || selectedYear === new Date().getFullYear()) && (
        <AwardCard
          title="Current Loss Streaks"
          winners={stats.currentLossStreaks.map((player: PlayerStats) => ({
            name: player.friendlyName,
            value: (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                <span className="font-bold text-right whitespace-nowrap w-20">{player.currentLossStreak} losses</span>
              </div>
            ),
            rawValue: player.currentLossStreak,
            id: player.id
          }))}
          icon={<TrendingDown className="w-6 h-6" />}
          color="rose"
        />
      )}

      {/* Longest Winless Streaks */}
      <AwardCard
        title="Longest Winless Streaks"
        winners={stats.topWinlessStreaks
          .sort((a, b) => (b?.maxWinlessStreak || 0) - (a?.maxWinlessStreak || 0))
          .map(player => {
            return {
              name: player?.friendlyName,
              value: (
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                  <span className="font-bold text-right whitespace-nowrap w-20">{player?.maxWinlessStreak} games</span>
                  {player?.maxWinlessStreakDate && (
                    <span className="text-xs opacity-80 text-right whitespace-nowrap w-24">
                      {new Intl.DateTimeFormat('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      }).format(new Date(player?.maxWinlessStreakDate))}
                    </span>
                  )}
                </div>
              ),
              rawValue: player?.maxWinlessStreak,
              id: player?.id
            }
          })}
        icon={<XCircle className="w-6 h-6" />}
        color="amber"
        description="Games without a win (broken only by wins)"
      />

      {/* Current Winless Streaks - Only show for current year or all time */}
      {(selectedYear === 'all' || selectedYear === new Date().getFullYear()) && (
        <AwardCard
          title="Current Winless Streaks"
          winners={stats.currentWinlessStreaks.map((player: PlayerStats) => ({
            name: player.friendlyName,
            value: (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                <span className="font-bold text-right whitespace-nowrap w-20">{player.currentWinlessStreak} games</span>
              </div>
            ),
            rawValue: player.currentWinlessStreak,
            id: player.id
          }))}
          icon={<XCircle className="w-6 h-6" />}
          color="yellow"
        />
      )}

      {/* Best Win Rates */}
      <StatsCard
        title="Best Win Rates"
        value=""
        stats={stats.bestWinRates}
        icon={<Percent className="w-6 h-6" />}
        description="Stats based on games with known outcomes and even teams only"
        color="teal"
      />
    </motion.div>
  );
};
