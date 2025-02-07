import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UnpaidGamesPenalty from './UnpaidGamesPenalty';
import GamePointsSection from './xp/GamePointsSection';
import ReserveXPSection from './xp/ReserveXPSection';
import StreakSection from './xp/StreakSection';
import TotalXPSection from './xp/TotalXPSection';

interface GameHistory {
  sequence: number;
  status: string;
  unpaid?: boolean;
}

interface XPBreakdownProps {
  stats: {
    caps: number;
    activeBonuses: number;
    activePenalties: number;
    currentStreak: number;
    gameHistory?: GameHistory[];
    latestSequence?: number;
    xp: number;
    reserveXP?: number;
    reserveCount?: number;
    benchWarmerStreak?: number;
    registrationStreak?: number;
    registrationStreakApplies?: boolean;
    unpaidGames: number; // Number of unpaid games (required)
  };
  showTotal?: boolean;
}

const XPBreakdown: React.FC<XPBreakdownProps> = ({ stats, showTotal = true }) => {
  const [isOpen, setIsOpen] = useState(false);

  console.log('XPBreakdown rendered with stats:', stats);

  // Ensure we have arrays of numbers and use the passed in latestSequence
  const gameHistory = stats.gameHistory || [];
  const latestSequence = stats.latestSequence || 0;

  // Calculate base XP from game history without multipliers
  const baseXP = stats.gameHistory.reduce((total, game) => {
    // Skip future games and games where player dropped out
    if (game.sequence > latestSequence || game.status === 'dropped_out') return total;
    
    // Calculate how many games ago this game was
    const gamesAgo = latestSequence - game.sequence;
    
    // Calculate XP based on how many games ago
    let xp = 0;
    if (gamesAgo === 0) xp = 20;
    else if (gamesAgo <= 2) xp = 18;
    else if (gamesAgo <= 4) xp = 16;
    else if (gamesAgo <= 9) xp = 14;
    else if (gamesAgo <= 19) xp = 12;
    else if (gamesAgo <= 29) xp = 10;
    else if (gamesAgo <= 39) xp = 5;
    
    return total + xp;
  }, 0);

  // Add reserve XP to base XP
  const totalBaseXP = baseXP + (stats.reserveXP || 0);

  // Calculate streak modifier (+10% per streak level)
  const streakModifier = stats.currentStreak * 0.1;

  // Calculate reserve modifier (+5% only if reserve in most recent game)
  const reserveModifier = stats.benchWarmerStreak ? stats.benchWarmerStreak * 0.05 : 0;

  // Calculate registration streak modifier (+2.5% per streak)
  // Only apply if registrationStreakApplies is true (all reserve and all registered)
  const registrationModifier = (stats.registrationStreak && stats.registrationStreakApplies) ? stats.registrationStreak * 0.025 : 0;

  // Calculate unpaid games modifier (-50% per unpaid game)
  const unpaidGamesModifier = stats.unpaidGames ? -0.5 * stats.unpaidGames : 0;

  // Calculate total modifier by combining all modifiers first
  const totalModifier = 1 + streakModifier + reserveModifier + registrationModifier + unpaidGamesModifier;

  // Calculate final XP (ensuring it's never negative)
  const finalXP = Math.max(0, Math.round(totalBaseXP * totalModifier));

  return (
    <div className="w-full">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <span className="inline-flex items-center justify-center w-4 h-4">ℹ️</span>
        <span className="font-medium">XP BREAKDOWN</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 bg-base-100 rounded-lg shadow-lg overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                {/* How XP is Calculated Section */}
                <div className="space-y-4">
                  <div className="collapse collapse-arrow bg-base-100">
                    <input type="checkbox" /> 
                    <div className="collapse-title font-medium text-primary">
                      How Your XP is Calculated
                    </div>
                    <div className="collapse-content">
                      <div className="text-sm opacity-70 space-y-6">
                        {/* Base Game Points */}
                        <div>
                          <h4 className="font-medium mb-2">Base Game Points</h4>
                          <p>You earn XP based on when games were played. The points decrease based on how many games have happened since:</p>
                          <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                            <li>Most Recent Game: 20 XP</li>
                            <li>2-3 Games Back: 18 XP</li>
                            <li>4-5 Games Back: 16 XP</li>
                            <li>6-10 Games Back: 14 XP</li>
                            <li>11-20 Games Back: 12 XP</li>
                            <li>21-30 Games Back: 10 XP</li>
                            <li>31-40 Games Back: 5 XP</li>
                            <li>Over 40 Games Back: 0 XP</li>
                          </ul>
                        </div>

                        {/* Reserve Points */}
                        <div>
                          <h4 className="font-medium mb-2">Reserve Points</h4>
                          <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                            <li>Being a reserve earns you +5 XP for each game in the last 40 games</li>
                            <li>If you are a reserve and end up accepting a slot due to a drop out, you get the base game points instead of the reserve points</li>
                            <li>If you decline a slot that opens up when someone drops out, you'll lose 10 XP (doesn't apply for same-day dropouts)</li>
                          </ul>
                        </div>

                        {/* Temporary Modifiers */}
                        <div>
                          <h4 className="font-medium mb-2">Temporary Bonuses</h4>
                          <p className="mb-2">Your XP can be temporarily boosted by maintaining different types of streaks:</p>
                          <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                            <li><span className="font-medium">Attendance Streak:</span> +10% XP per consecutive game played. Resets if you don't play a game.</li>
                            <li><span className="font-medium">Bench Warmer Streak:</span> +5% XP per consecutive reserve appearance without getting to play. Also increases your chances in random selection. Resets if you play or miss a game.</li>
                            <li><span className="font-medium">Registration Streak:</span> +2.5% XP per consecutive game you register for. Builds regardless of whether you get selected to play or not, but only applies when you don't get selected to play. Resets if you don't register for a game.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Game Points Section */}
                <GamePointsSection
                  gameHistory={gameHistory}
                  latestSequence={latestSequence}
                  baseXP={baseXP}
                />

                {/* Reserve XP Section */}
                <ReserveXPSection
                  reserveXP={stats.reserveXP || 0}
                  reserveCount={stats.reserveCount || 0}
                />

                {/* Attendance Streak Section */}
                {stats.currentStreak > 0 && (
                  <StreakSection
                    title="Attendance Streak"
                    streakCount={stats.currentStreak}
                    bonusPerStreak={10}
                    description={`${stats.currentStreak} game streak (+${(stats.currentStreak * 10)}% XP)`}
                  />
                )}

                {/* Bench Warmer Streak Section */}
                {stats.benchWarmerStreak > 0 && stats.currentStreak === 0 && (
                  <StreakSection
                    title="Reserve Streak"
                    streakCount={stats.benchWarmerStreak}
                    bonusPerStreak={5}
                    description={`${stats.benchWarmerStreak} consecutive reserve appearance${stats.benchWarmerStreak !== 1 ? 's' : ''} (+${(stats.benchWarmerStreak * 5)}% XP)`}
                  />
                )}

                {/* Registration Streak Section */}
                {stats.registrationStreak > 0 && stats.registrationStreakApplies && (
                  <StreakSection
                    title="Registration Streak"
                    streakCount={stats.registrationStreak}
                    bonusPerStreak={2.5}
                    description={`${stats.registrationStreak} consecutive registration${stats.registrationStreak !== 1 ? 's' : ''} (+${(stats.registrationStreak * 2.5)}% XP)`}
                  />
                )}

                {/* Unpaid Games Penalty */}
                {stats.unpaidGames > 0 && (
                  <UnpaidGamesPenalty
                    unpaidGames={stats.unpaidGames}
                    penaltyPercentage={50}
                  />
                )}

                {/* Total XP Section */}
                {showTotal && (
                  <TotalXPSection
                    baseXP={baseXP}
                    reserveXP={stats.reserveXP || 0}
                    streakModifier={streakModifier}
                    reserveModifier={reserveModifier}
                    registrationModifier={registrationModifier}
                    unpaidGamesModifier={unpaidGamesModifier}
                    finalXP={finalXP}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default XPBreakdown;
