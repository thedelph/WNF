import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  Crown, 
  Percent, 
  ShirtIcon,
  Flame,
  Heart,
  Award,
  Shield
} from 'lucide-react';
import { StatsCard } from '../components/stats/StatsCard';
import { AwardCard } from '../components/stats/AwardCard';
import { YearSelector } from '../components/stats/YearSelector';
import { HighestXPCard } from '../components/stats/HighestXPCard';
import { GoalDifferentialsCard } from '../components/stats/GoalDifferentialsCard';
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
        {/* Goal Differential Stats - Custom card with perfect column alignment */}
        <GoalDifferentialsCard goalDifferentials={stats.goalDifferentials} />
        
        {/* Highest XP Records */}
        <HighestXPCard selectedYear={selectedYear} />

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
            winners={stats.currentWinStreaks.map(player => ({
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
            color="teal"
            description="Streaks that are broken by both losses and draws"
          />
        )}

        {/* Top All-Time Unbeaten Streaks */}
        <AwardCard
          title="Longest Unbeaten Streaks"
          winners={stats.topUnbeatenStreaks
            // Sort by maxUnbeatenStreak in descending order to ensure correct medal assignment
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
                // Add the raw win streak value for medal calculation
                rawValue: player?.maxUnbeatenStreak,
                id: player?.id
              }
            })}
          icon={<Shield className="w-6 h-6" />}
          color="indigo"
          description="Streaks that are only broken by losses (draws don't break streaks)"
        />

        {/* Current Unbeaten Streaks - Only show for current year or all time */}
        {(selectedYear === 'all' || selectedYear === new Date().getFullYear()) && (
          <AwardCard
            title="Current Unbeaten Streaks"
            winners={stats.currentUnbeatenStreaks.map(player => ({
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
            color="blue"
            description="Streaks that are only broken by losses (draws don't break streaks)"
          />
        )}

        {/* Top All-Time Streaks */}
        <AwardCard
          title="Longest Attendance Streaks"
          winners={stats.topAttendanceStreaks.map(player => ({
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

        {/* Current Streaks - Only show for current year or all time */}
        {(selectedYear === 'all' || selectedYear === new Date().getFullYear()) && (
          <AwardCard
            title="Current Attendance Streaks"
            winners={stats.currentStreaks.map(player => ({
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

        {/* Lucky Bib Colour */}
        <StatsCard
          title="Lucky Bib Colour"
          value={stats.luckyBibColor.color.toUpperCase()}
          description={`${stats.luckyBibColor.winRate.toFixed(1)}% Win Rate`}
          color={stats.luckyBibColor.color as 'blue' | 'orange'}
          icon={<ShirtIcon className="w-6 h-6" />}
        />

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
          value=""
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
