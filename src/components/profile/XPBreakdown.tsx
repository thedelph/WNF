import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import UnpaidGamesPenalty from './UnpaidGamesPenalty';

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
  const [isExpanded, setIsExpanded] = useState(false);

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
  const reserveModifier = gameHistory.some(game => 
    game.sequence === latestSequence && game.status === 'reserve'
  ) ? 0.05 : 0;

  // Calculate registration streak modifier (+2.5% per streak)
  // Only apply if registrationStreakApplies is true (all reserve and all registered)
  const registrationModifier = (stats.registrationStreak && stats.registrationStreakApplies) ? stats.registrationStreak * 0.025 : 0;

  // Calculate unpaid games modifier (-50% per unpaid game)
  const unpaidGamesModifier = stats.unpaidGames ? -0.5 * stats.unpaidGames : 0;

  // Calculate total modifier by combining all modifiers first
  const totalModifier = 1 + streakModifier + reserveModifier + registrationModifier + unpaidGamesModifier;

  // Calculate final XP (ensuring it's never negative)
  const finalXP = Math.max(0, Math.round(totalBaseXP * totalModifier));

  // Sort sequences by how many games ago they are, excluding only future games
  const sortedHistory = [...gameHistory]
    .filter(game => game.sequence <= latestSequence) // Only exclude future games
    .sort((a, b) => b.sequence - a.sequence);

  // Animation variants
  const contentVariants = {
    collapsed: { height: 0, opacity: 0 },
    expanded: { height: "auto", opacity: 1 },
  };

  return (
    <div className="mt-4">
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
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 bg-base-200 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4">XP Breakdown</h3>

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

                {/* Base XP from Games */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-medium text-primary border-b border-base-300 pb-2">
                    Game Points ({baseXP} Total Base XP)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Most Recent Game - 20 XP */}
                    {sortedHistory.filter(game => latestSequence - game.sequence === 0).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">Most Recent Game</h5>
                              <p className="text-sm opacity-70 text-base-content/70">20 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">
                                {sortedHistory.filter(game => latestSequence - game.sequence === 0).length * 20} XP
                              </div>
                              <div className="text-xs opacity-70 text-base-content/70">
                                {sortedHistory.filter(game => latestSequence - game.sequence === 0).length} game
                                {sortedHistory.filter(game => latestSequence - game.sequence === 0).length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2-3 Games Back - 18 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 1 && gamesAgo <= 2;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">2-3 Games Back</h5>
                              <p className="text-sm opacity-70 text-base-content/70">18 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 1 && gamesAgo <= 2;
                                }).length * 18} XP
                              </div>
                              <div className="text-xs opacity-70 text-base-content/70">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 1 && gamesAgo <= 2;
                                }).length} game
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 1 && gamesAgo <= 2;
                                }).length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4-5 Games Back - 16 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 3 && gamesAgo <= 4;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">4-5 Games Back</h5>
                              <p className="text-sm opacity-70 text-base-content/70">16 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 3 && gamesAgo <= 4;
                                }).length * 16} XP
                              </div>
                              <div className="text-xs opacity-70 text-base-content/70">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 3 && gamesAgo <= 4;
                                }).length} game
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 3 && gamesAgo <= 4;
                                }).length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 6-10 Games Back - 14 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 5 && gamesAgo <= 9;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">6-10 Games Back</h5>
                              <p className="text-sm opacity-70 text-base-content/70">14 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 5 && gamesAgo <= 9;
                                }).length * 14} XP
                              </div>
                              <div className="text-xs opacity-70 text-base-content/70">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 5 && gamesAgo <= 9;
                                }).length} game
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 5 && gamesAgo <= 9;
                                }).length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 11-20 Games Back - 12 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 10 && gamesAgo <= 19;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">11-20 Games Back</h5>
                              <p className="text-sm opacity-70 text-base-content/70">12 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 10 && gamesAgo <= 19;
                                }).length * 12} XP
                              </div>
                              <div className="text-xs opacity-70 text-base-content/70">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 10 && gamesAgo <= 19;
                                }).length} game
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 10 && gamesAgo <= 19;
                                }).length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 21-30 Games Back - 10 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 20 && gamesAgo <= 29;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">21-30 Games Back</h5>
                              <p className="text-sm opacity-70 text-base-content/70">10 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 20 && gamesAgo <= 29;
                                }).length * 10} XP
                              </div>
                              <div className="text-xs opacity-70 text-base-content/70">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 20 && gamesAgo <= 29;
                                }).length} game
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 20 && gamesAgo <= 29;
                                }).length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 31-40 Games Back - 5 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 30 && gamesAgo <= 39;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">31-40 Games Back</h5>
                              <p className="text-sm opacity-70 text-base-content/70">5 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 30 && gamesAgo <= 39;
                                }).length * 5} XP
                              </div>
                              <div className="text-xs opacity-70 text-base-content/70">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 30 && gamesAgo <= 39;
                                }).length} game
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 30 && gamesAgo <= 39;
                                }).length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Over 40 Games Back - 0 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 40;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">Over 40 Games Back</h5>
                              <p className="text-sm opacity-70 text-base-content/70">0 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">0 XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 40;
                                }).length} game
                                {sortedHistory.filter(game => {
                                  const gamesAgo = latestSequence - game.sequence;
                                  return gamesAgo >= 40;
                                }).length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reserve XP if any */}
                {console.log('Rendering Reserve XP section:', stats.reserveXP, stats.reserveCount) || 
                (stats.reserveXP > 0 && (
                  <div className="space-y-4 mb-6">
                    <h4 className="font-medium text-primary border-b border-base-300 pb-2">
                      Reserve XP
                    </h4>
                    <div className={clsx(
                      "card shadow-sm",
                      "bg-success/10"
                    )}>
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium text-success-content">
                              Reserve Bonus
                            </h5>
                            <p className="text-sm text-success-content/70">
                              For being a reserve ({stats.reserveCount} time{stats.reserveCount !== 1 ? 's' : ''})
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg font-bold text-success">
                              +{stats.reserveXP} XP
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Streak Multiplier - only show if there is a streak */}
                {stats.currentStreak > 0 && (
                  <div className="space-y-4 mb-6">
                    <h4 className="font-medium text-primary border-b border-base-300 pb-2">
                      Attendance Streak
                    </h4>
                    <div className="card shadow-sm bg-success/10">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium text-success-content">
                              Attendance Streak
                            </h5>
                            <p className="text-sm text-success-content/70">
                              {stats.currentStreak} game streak (+{(stats.currentStreak * 10)}% XP)
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg font-bold text-success">
                              +{(stats.currentStreak * 10)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bench Warmer Bonus - only show if there's no attendance streak */}
                {stats.reserveCount > 0 && stats.currentStreak === 0 && (
                  <div className="space-y-4 mb-6">
                    <h4 className="font-medium text-primary border-b border-base-300 pb-2">
                      Reserve Streak
                    </h4>
                    <div className="card shadow-sm bg-success/10">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium text-success-content">
                              Reserve Streak
                            </h5>
                            <p className="text-sm text-success-content/70">
                              {stats.reserveCount} reserve appearance{stats.reserveCount !== 1 ? 's' : ''} (+{(stats.reserveCount * 5)}% XP)
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg font-bold text-success">
                              +{(stats.reserveCount * 5)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Registration Streak - only show if there's a streak AND it applies */}
                {(stats.registrationStreak > 0 && stats.registrationStreakApplies) && (
                  <div className="space-y-4 mb-6">
                    <h4 className="font-medium text-primary border-b border-base-300 pb-2">
                      Registration Streak
                    </h4>
                    <div className="card shadow-sm bg-success/10">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium text-success-content">
                              Registration Streak
                            </h5>
                            <p className="text-sm text-success-content/70">
                              {stats.registrationStreak} consecutive reserve registrations (+{(stats.registrationStreak * 2.5)}% XP)
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg font-bold text-success">
                              +{(stats.registrationStreak * 2.5)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unpaid Games Penalty - only show if there are unpaid games */}
                {stats.unpaidGames > 0 && (
                  <UnpaidGamesPenalty
                    unpaidGames={stats.unpaidGames}
                    penaltyPercentage={50}
                  />
                )}

                {/* Total XP */}
                {showTotal && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-primary border-b border-base-300 pb-2">
                      Total XP
                    </h4>
                    <div className="card bg-base-100 shadow-sm">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium">Final XP</h5>
                            <p className="text-sm text-base-content/70">
                              Including Streak & Reserve XP
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg font-bold">
                              {finalXP} XP
                            </div>
                            <div className="text-xs text-base-content/70">
                              {(stats.reserveXP || 0) > 0 ? `(${baseXP} + ${stats.reserveXP})` : baseXP}
                              {(streakModifier !== 0 || reserveModifier !== 0 || registrationModifier !== 0 || unpaidGamesModifier !== 0) && 
                                ` × (1${streakModifier > 0 ? ` + ${streakModifier.toFixed(2)}` : ''}${
                                  reserveModifier > 0 ? ` + ${reserveModifier.toFixed(2)}` : ''}${
                                  registrationModifier > 0 ? ` + ${registrationModifier.toFixed(2)}` : ''}${
                                  unpaidGamesModifier !== 0 ? ` + ${unpaidGamesModifier.toFixed(2)}` : ''})`
                              }
                            </div>
                            <div className="text-xs text-base-content/50">
                              {(stats.reserveXP || 0) > 0 ? '(Base XP + Reserve XP)' : 'Base XP'}
                              {(streakModifier !== 0 || reserveModifier !== 0 || registrationModifier !== 0 || unpaidGamesModifier !== 0) && 
                                ` × (1${streakModifier > 0 ? ' + Attendance Streak Modifier' : ''}${
                                  reserveModifier > 0 ? ' + Reserve Streak Modifier' : ''}${
                                  registrationModifier > 0 ? ' + Registration Streak Modifier' : ''}${
                                  unpaidGamesModifier !== 0 ? ' + Unpaid Games Modifier' : ''})`
                              }
                              {totalBaseXP * totalModifier < 0 && ' (XP will never be less than 0)'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default XPBreakdown;
