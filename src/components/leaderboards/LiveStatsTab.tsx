/**
 * LiveStatsTab component - Displays real-time computed statistics
 * Design: Combines content from AttendanceStats, PerformanceStats, and OtherStats
 */

import { motion } from 'framer-motion';
import {
  Trophy, Crown, Flame, Award, Percent, TrendingUp, Shield,
  TrendingDown, XCircle, Beaker, ShirtIcon, Heart, Star, Swords, Users
} from 'lucide-react';
import { AwardCard } from '../stats/AwardCard';
import { StatsCard } from '../stats/StatsCard';
import { GoalDifferentialsCard } from '../stats/GoalDifferentialsCard';
import { HighestXPCard } from '../stats/HighestXPCard';
import { Stats, PlayerStats, ChemistryPairStats, TeamColorStats, BestBuddies } from '../../hooks/useStats';
import { useRivalryLeaderboard } from '../../hooks/useRivalry';
import { useTrioLeaderboard } from '../../hooks/useTrioChemistry';
import { useMotmLeaderboard } from '../../hooks/useMotmLeaderboard';
import { RivalryPairLeaderboard, TrioLeaderboard } from '../../types/chemistry';

interface LiveStatsTabProps {
  stats: Stats;
  selectedYear: number | 'all';
}

export const LiveStatsTab = ({ stats, selectedYear }: LiveStatsTabProps) => {
  // Fetch rivalry and trio leaderboard data
  const yearFilter = selectedYear === 'all' ? null : selectedYear;
  const { rivalries } = useRivalryLeaderboard(yearFilter, 5);
  const { dreamTeams, cursedTrios } = useTrioLeaderboard(yearFilter, 5);
  const { leaders: motmLeaders } = useMotmLeaderboard(5);

  // Animation variants for container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06
      }
    }
  };

  // Check if current streaks should be shown
  const showCurrentStreaks = selectedYear === 'all' || selectedYear === new Date().getFullYear();

  // Date formatter
  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateStr));
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Current Streaks Section - Only show for current year or all time */}
      {showCurrentStreaks && (
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Current Streaks
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Current Attendance Streaks - matches Iron Man (indigo = steel/endurance) */}
            <AwardCard
              title="Current Attendance Streaks"
              winners={stats.currentStreaks.map((player: PlayerStats) => ({
                name: player.friendlyName,
                value: `${player.currentStreak} games`,
                rawValue: player.currentStreak,
                id: player.id
              }))}
              icon={<Flame className="w-6 h-6" />}
              color="indigo"
            />

            {/* Current Win Streaks - matches Hot Streak (rose) */}
            <AwardCard
              title="Current Win Streaks"
              winners={stats.currentWinStreaks.map((player: PlayerStats) => ({
                name: player.friendlyName,
                value: `${player.currentWinStreak} wins`,
                rawValue: player.currentWinStreak,
                id: player.id
              }))}
              icon={<TrendingUp className="w-6 h-6" />}
              color="rose"
            />

            {/* Current Unbeaten Streaks */}
            <AwardCard
              title="Current Unbeaten Streaks"
              winners={stats.currentUnbeatenStreaks.map((player: PlayerStats) => ({
                name: player.friendlyName,
                value: `${player.currentUnbeatenStreak} games`,
                rawValue: player.currentUnbeatenStreak,
                id: player.id
              }))}
              icon={<Shield className="w-6 h-6" />}
              color="indigo"
            />

            {/* Current Loss Streaks - red (danger, losing) */}
            <AwardCard
              title="Current Loss Streaks"
              winners={stats.currentLossStreaks.map((player: PlayerStats) => ({
                name: player.friendlyName,
                value: `${player.currentLossStreak} losses`,
                rawValue: player.currentLossStreak,
                id: player.id
              }))}
              icon={<TrendingDown className="w-6 h-6" />}
              color="red"
            />

            {/* Current Winless Streaks - amber (negative version of unbeaten) */}
            <AwardCard
              title="Current Winless Streaks"
              winners={stats.currentWinlessStreaks.map((player: PlayerStats) => ({
                name: player.friendlyName,
                value: `${player.currentWinlessStreak} games`,
                rawValue: player.currentWinlessStreak,
                id: player.id
              }))}
              icon={<XCircle className="w-6 h-6" />}
              color="amber"
            />
          </div>
        </section>
      )}

      {/* Leaderboards Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Leaderboards
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* XP Leaderboard */}
          <HighestXPCard selectedYear={selectedYear} />

          {/* Appearance King - purple = royalty */}
          <AwardCard
            title="Appearance King"
            winners={stats.mostCaps.map((player: PlayerStats) => ({
              name: player.friendlyName,
              value: `${player.caps} games`,
              id: player.id
            }))}
            icon={<Trophy className="w-6 h-6" />}
            color="purple"
          />

          {/* Win Rate Leader - green = success */}
          <StatsCard
            title="Win Rate Leader"
            value=""
            stats={stats.bestWinRates}
            icon={<Percent className="w-6 h-6" />}
            description="Points system: W=3, D=1, L=0. Min 10 even-team games."
            color="green"
          />

          {/* Dynamic Duo (Best Chemistry) - pink = chemistry, connection */}
          <AwardCard
            title="Dynamic Duo"
            winners={stats.bestChemistry.map((pair: ChemistryPairStats) => ({
              id: `${pair.player1Id}-${pair.player2Id}`,
              name: `${pair.player1Name} & ${pair.player2Name}`,
              value: (
                <>
                  <span className="text-sm opacity-90 font-medium">{pair.chemistryScore.toFixed(1)} chemistry</span>
                  <div className="text-xs opacity-70">
                    {pair.winsTogether}W {pair.drawsTogether}D {pair.lossesTogether}L · {pair.gamesTogether} games · {pair.performanceRate.toFixed(0)}%
                  </div>
                </>
              ),
              rawValue: pair.chemistryScore
            }))}
            icon={<Beaker className="w-6 h-6" />}
            color="pink"
            description="Best chemistry pair (win rate × games played)"
            isMultiPlayer
          />

          {/* Cursed Duos (Worst Chemistry) */}
          {stats.worstChemistry.length > 0 && (
            <AwardCard
              title="Cursed Duos"
              winners={stats.worstChemistry.map((pair: ChemistryPairStats) => ({
                id: `${pair.player1Id}-${pair.player2Id}`,
                name: `${pair.player1Name} & ${pair.player2Name}`,
                value: (
                  <>
                    <span className="text-sm opacity-90 font-medium">{pair.curseScore.toFixed(1)} curse</span>
                    <div className="text-xs opacity-70">
                      {pair.winsTogether}W {pair.drawsTogether}D {pair.lossesTogether}L · {pair.gamesTogether} games · {pair.performanceRate.toFixed(0)}%
                    </div>
                  </>
                ),
                rawValue: pair.curseScore
              }))}
              icon={<Beaker className="w-6 h-6" />}
              color="rose"
              description="Worst chemistry pair (loss rate × games played)"
              isMultiPlayer
            />
          )}

          {/* Fiercest Rivalry */}
          {rivalries.length > 0 && (
            <AwardCard
              title="Fiercest Rivalry"
              winners={rivalries.map((rivalry: RivalryPairLeaderboard) => ({
                id: `${rivalry.player1Id}-${rivalry.player2Id}`,
                name: `${rivalry.player1Name} vs ${rivalry.player2Name}`,
                value: (
                  <>
                    <span className="text-sm opacity-90 font-medium">{rivalry.rivalryScore.toFixed(1)} rivalry</span>
                    <div className="text-xs opacity-70">
                      {rivalry.playerWins}W {rivalry.draws}D {rivalry.opponentWins}L · {rivalry.gamesAgainst} games · {rivalry.performanceRate.toFixed(0)}%
                    </div>
                  </>
                ),
                rawValue: rivalry.rivalryScore
              }))}
              icon={<Swords className="w-6 h-6" />}
              color="red"
              description="Head-to-head when on opposite teams (min 5 games)"
              isMultiPlayer
            />
          )}

          {/* Dream Team Trio */}
          {dreamTeams.length > 0 && (
            <AwardCard
              title="Dream Team Trio"
              winners={dreamTeams.map((trio: TrioLeaderboard) => ({
                id: `${trio.player1Id}-${trio.player2Id}-${trio.player3Id}`,
                name: `${trio.player1Name}, ${trio.player2Name} & ${trio.player3Name}`,
                value: (
                  <>
                    <span className="text-sm opacity-90 font-medium">{trio.trioScore.toFixed(1)} chemistry</span>
                    <div className="text-xs opacity-70">
                      {trio.wins}W {trio.draws}D {trio.losses}L · {trio.gamesTogether} games · {trio.performanceRate.toFixed(0)}%
                    </div>
                  </>
                ),
                rawValue: trio.trioScore
              }))}
              icon={<Users className="w-6 h-6" />}
              color="purple"
              description="Best 3-player combos (min 3 games)"
              isMultiPlayer
            />
          )}

          {/* Cursed Trio */}
          {cursedTrios.length > 0 && (
            <AwardCard
              title="Cursed Trio"
              winners={cursedTrios.map((trio: TrioLeaderboard) => ({
                id: `${trio.player1Id}-${trio.player2Id}-${trio.player3Id}`,
                name: `${trio.player1Name}, ${trio.player2Name} & ${trio.player3Name}`,
                value: (
                  <>
                    <span className="text-sm opacity-90 font-medium">{trio.curseScore.toFixed(1)} curse</span>
                    <div className="text-xs opacity-70">
                      {trio.wins}W {trio.draws}D {trio.losses}L · {trio.gamesTogether} games · {trio.performanceRate.toFixed(0)}%
                    </div>
                  </>
                ),
                rawValue: trio.curseScore
              }))}
              icon={<Users className="w-6 h-6" />}
              color="slate"
              description="Worst 3-player combos (min 3 games)"
              isMultiPlayer
            />
          )}

          {/* Goal Differentials */}
          <GoalDifferentialsCard goalDifferentials={stats.goalDifferentials} />

          {/* MOTM Leaders */}
          {motmLeaders.length > 0 && (
            <AwardCard
              title="MOTM Leaders"
              winners={motmLeaders.map(l => ({
                id: l.playerId,
                name: l.playerName,
                value: `${l.motmCount} award${l.motmCount !== 1 ? 's' : ''}`,
                rawValue: l.motmCount,
              }))}
              icon={<Crown className="w-6 h-6" />}
              color="amber"
              description="Most Man of the Match awards"
            />
          )}
        </div>
      </section>

      {/* Historical Records Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-500" />
          Historical Records
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Iron Man - indigo = steel/endurance */}
          <AwardCard
            title="Iron Man"
            winners={stats.topAttendanceStreaks.map((player: PlayerStats) => ({
              name: player.friendlyName,
              value: (
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 justify-end">
                  <span className="font-bold whitespace-nowrap">{player.maxStreak} games</span>
                  {player.maxAttendanceStreakDate && (
                    <span className="text-xs opacity-80 whitespace-nowrap">
                      {formatDate(player.maxAttendanceStreakDate)}
                    </span>
                  )}
                </div>
              ),
              rawValue: player.maxStreak,
              id: player.id
            }))}
            icon={<Crown className="w-6 h-6" />}
            color="indigo"
          />

          {/* Hot Streak - rose = fire, momentum */}
          <AwardCard
            title="Hot Streak"
            winners={stats.topWinStreaks
              .sort((a, b) => (b?.maxWinStreak || 0) - (a?.maxWinStreak || 0))
              .map(player => ({
                name: player?.friendlyName,
                value: (
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 justify-end">
                    <span className="font-bold whitespace-nowrap">{player?.maxWinStreak} wins</span>
                    {player?.maxStreakDate && (
                      <span className="text-xs opacity-80 whitespace-nowrap">
                        {formatDate(player?.maxStreakDate)}
                      </span>
                    )}
                  </div>
                ),
                rawValue: player?.maxWinStreak,
                id: player?.id
              }))}
            icon={<Award className="w-6 h-6" />}
            color="rose"
            description="Broken by both losses and draws"
          />

          {/* The Wall - indigo = fortress */}
          <AwardCard
            title="The Wall"
            winners={stats.topUnbeatenStreaks
              .sort((a, b) => (b?.maxUnbeatenStreak || 0) - (a?.maxUnbeatenStreak || 0))
              .map(player => ({
                name: player?.friendlyName,
                value: (
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 justify-end">
                    <span className="font-bold whitespace-nowrap">{player?.maxUnbeatenStreak} games</span>
                    {player?.maxUnbeatenStreakDate && (
                      <span className="text-xs opacity-80 whitespace-nowrap">
                        {formatDate(player?.maxUnbeatenStreakDate)}
                      </span>
                    )}
                  </div>
                ),
                rawValue: player?.maxUnbeatenStreak,
                id: player?.id
              }))}
            icon={<Shield className="w-6 h-6" />}
            color="indigo"
            description="Only broken by losses (draws maintain streak)"
          />

          {/* Longest Loss Streaks */}
          <AwardCard
            title="Longest Loss Streaks"
            winners={stats.topLossStreaks
              .sort((a, b) => (b?.maxLossStreak || 0) - (a?.maxLossStreak || 0))
              .map(player => ({
                name: player?.friendlyName,
                value: (
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 justify-end">
                    <span className="font-bold whitespace-nowrap">{player?.maxLossStreak} losses</span>
                    {player?.maxLossStreakDate && (
                      <span className="text-xs opacity-80 whitespace-nowrap">
                        {formatDate(player?.maxLossStreakDate)}
                      </span>
                    )}
                  </div>
                ),
                rawValue: player?.maxLossStreak,
                id: player?.id
              }))}
            icon={<TrendingDown className="w-6 h-6" />}
            color="red"
            description="Broken by wins or draws"
          />

          {/* Longest Winless Streaks */}
          <AwardCard
            title="Longest Winless Streaks"
            winners={stats.topWinlessStreaks
              .sort((a, b) => (b?.maxWinlessStreak || 0) - (a?.maxWinlessStreak || 0))
              .map(player => ({
                name: player?.friendlyName,
                value: (
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 justify-end">
                    <span className="font-bold whitespace-nowrap">{player?.maxWinlessStreak} games</span>
                    {player?.maxWinlessStreakDate && (
                      <span className="text-xs opacity-80 whitespace-nowrap">
                        {formatDate(player?.maxWinlessStreakDate)}
                      </span>
                    )}
                  </div>
                ),
                rawValue: player?.maxWinlessStreak,
                id: player?.id
              }))}
            icon={<XCircle className="w-6 h-6" />}
            color="amber"
            description="Broken only by wins"
          />
        </div>
      </section>

      {/* Fun Stats Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-pink-500" />
          Fun Stats
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Lucky Bib Colour */}
          <StatsCard
            title="Lucky Bib Colour"
            value={stats.luckyBibColor.color.toUpperCase()}
            description={`${stats.luckyBibColor.winRate.toFixed(1)}% Win Rate`}
            color={stats.luckyBibColor.color as 'blue' | 'orange'}
            icon={<ShirtIcon className="w-6 h-6" />}
          />

          {/* Best Buddies - teal = friendship, loyalty */}
          <AwardCard
            title="Best Buddies"
            winners={stats.bestBuddies.map((buddy: BestBuddies) => ({
              id: `${buddy.id}-${buddy.buddyId}`,
              name: `${buddy.friendlyName} & ${buddy.buddyFriendlyName}`,
              value: `${buddy.gamesTogether} games`
            }))}
            icon={<Heart className="w-6 h-6" />}
            color="teal"
            description="Players on the same team most often"
            isMultiPlayer
          />

          {/* Blue Blood - blue = team semantic */}
          <AwardCard
            title="Blue Blood"
            winners={stats.teamColorFrequency.blue.map((player: TeamColorStats) => ({
              name: player.friendlyName,
              value: `${(player.teamFrequency * 100).toFixed(1)}%`,
              id: player.id
            }))}
            description="Highest % on blue team"
            icon={<Star className="w-6 h-6" />}
            color="blue"
          />

          {/* Dutch Master - orange = team semantic */}
          <AwardCard
            title="Dutch Master"
            winners={stats.teamColorFrequency.orange.map((player: TeamColorStats) => ({
              name: player.friendlyName,
              value: `${(player.teamFrequency * 100).toFixed(1)}%`,
              id: player.id
            }))}
            description="Highest % on orange team"
            icon={<Star className="w-6 h-6" />}
            color="orange"
          />
        </div>
      </section>
    </motion.div>
  );
};

export default LiveStatsTab;
