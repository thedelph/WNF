import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UnpaidGamesPenalty from './UnpaidGamesPenalty';
import GamePointsSection from './xp/GamePointsSection';
import ReserveXPSection from './xp/ReserveXPSection';
import StreakSection from './xp/StreakSection';
import TotalXPSection from './xp/TotalXPSection';

// Debug flag - set to true to enable verbose logging
const DEBUG_XP_BREAKDOWN = false;
const debugLog = (...args: unknown[]) => DEBUG_XP_BREAKDOWN && debugLog(...args);

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
    shieldActive?: boolean; // Whether player has active shield protection
    frozenStreakValue?: number | null; // Frozen streak value when shield is active
  };
  showTotal?: boolean;
}

const XPBreakdown: React.FC<XPBreakdownProps> = ({ stats, showTotal = true }) => {
  const [isOpen, setIsOpen] = useState(false);

  debugLog('[XPBreakdown] Initial stats:', stats);

  // Ensure we have arrays of numbers and use the passed in latestSequence
  const gameHistory = stats.gameHistory || [];
  const latestSequence = stats.latestSequence || 0;

  debugLog('[XPBreakdown] Game history:', { 
    gameHistory,
    latestSequence,
    totalGames: gameHistory.length
  });

  // Calculate base XP from game history without multipliers
  const baseXP = gameHistory.reduce((total, game) => {
    // Skip future games and games where player dropped out
    if (game.sequence > latestSequence || game.status === 'dropped_out') {
      debugLog(`[XPBreakdown] Skipping game ${game.sequence} - ${game.status === 'dropped_out' ? 'dropped out' : 'future game'}`);
      return total;
    }
    
    // Skip reserve games as they're handled separately
    if (game.status === 'reserve') {
      debugLog(`[XPBreakdown] Skipping game ${game.sequence} - reserve game`);
      return total;
    }
    
    // Calculate how many games ago this game was
    const gamesAgo = latestSequence - game.sequence;

    // Calculate XP based on how many games ago (v2: linear decay with floor of 1)
    // Formula: max(1, 20 - (gamesAgo * 0.5))
    let xp = Math.max(1, 20 - (gamesAgo * 0.5));
    
    debugLog(`[XPBreakdown] Game ${game.sequence} (${gamesAgo} games ago) - Adding ${xp} XP`);
    return total + xp;
  }, 0);

  debugLog('[XPBreakdown] Base XP calculation:', { baseXP });

  // Add reserve XP to base XP
  const totalBaseXP = baseXP + (stats.reserveXP || 0);
  debugLog('[XPBreakdown] Total Base XP:', { 
    baseXP, 
    reserveXP: stats.reserveXP, 
    totalBaseXP,
    reserveCount: stats.reserveCount,
    fullStats: stats
  });

  // Calculate streak modifier (v2: diminishing returns)
  // Use frozen streak value if shield is active, otherwise use current streak
  const effectiveStreak = stats.shieldActive && stats.frozenStreakValue !== null && stats.frozenStreakValue !== undefined
    ? stats.frozenStreakValue
    : stats.currentStreak;

  // v2 diminishing returns formula:
  // First 10 games: 10%, 9%, 8%, 7%, 6%, 5%, 4%, 3%, 2%, 1% (total 55%)
  // After 10 games: +1% per additional game
  const calculateStreakBonus = (streak: number): number => {
    if (streak <= 0) return 0;
    if (streak <= 10) {
      // Sum formula: 10 + 9 + 8 + ... + (11 - streak)
      return (streak * 11 - (streak * (streak + 1)) / 2) / 100;
    }
    // 55% + 1% for each game beyond 10
    return (55 + (streak - 10)) / 100;
  };
  const streakModifier = calculateStreakBonus(effectiveStreak);
  const streakPercentage = Math.round(streakModifier * 100);

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

  debugLog('[XPBreakdown] Registration streak details:', {
    registrationStreak: stats.registrationStreak,
    registrationStreakApplies: stats.registrationStreakApplies,
    registrationModifier,
    shouldShowSection: stats.registrationStreak > 0 && stats.registrationStreakApplies
  });

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
                          <p>You earn XP based on when games were played. Points decay gradually - you lose 0.5 XP for each game that passes:</p>
                          <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                            <li>Most Recent Game: 20 XP</li>
                            <li>10 Games Back: 15 XP</li>
                            <li>20 Games Back: 10 XP</li>
                            <li>30 Games Back: 5 XP</li>
                            <li>38+ Games Back: 1 XP (minimum)</li>
                          </ul>
                          <p className="mt-2 text-xs opacity-60">Your long-term commitment matters - games never drop to 0 XP.</p>
                        </div>

                        {/* Reserve Points */}
                        <div>
                          <h4 className="font-medium mb-2">Reserve Points</h4>
                          <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                            <li>Being a reserve (provided you registered within the registration window) earns you +5 XP for each game in the last 40 games</li>
                            <li>Late reserves (registered after the registration window) do not get XP if they don't play</li>
                            <li> If you are a reserve and end up accepting a slot due to a drop out, you get the base game points instead of the reserve points</li>
                            <li>If you decline a slot that opens up when someone drops out, you'll lose 10 XP (doesn't apply for same-day dropouts)</li>
                          </ul>
                        </div>

                        {/* Temporary Modifiers */}
                        <div>
                          <h4 className="font-medium mb-2">Temporary Bonuses</h4>
                          <p className="mb-2">Your XP can be temporarily boosted by maintaining different types of streaks:</p>
                          <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                            <li><span className="font-medium">Attendance Streak:</span> Diminishing returns - +10% for 1st game, +9% for 2nd, +8% for 3rd... down to +1% per game after 10. Maximum bonus around 72%. Resets if you don't play.</li>
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
                {debugLog('[XPBreakdown] ReserveXPSection props:', { reserveXP: stats.reserveXP, reserveCount: stats.reserveCount })}

                {/* Attendance Streak Section */}
                {effectiveStreak > 0 && (
                  <StreakSection
                    title={stats.shieldActive && stats.frozenStreakValue ? "🛡️ Protected Streak" : "Attendance Streak"}
                    streakCount={effectiveStreak}
                    bonusPerStreak={streakPercentage / effectiveStreak} // Pass calculated rate for display
                    description={
                      stats.shieldActive && stats.frozenStreakValue
                        ? `${effectiveStreak} game streak frozen by shield (+${streakPercentage}% XP protected)`
                        : `${effectiveStreak} game streak (+${streakPercentage}% XP)`
                    }
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
