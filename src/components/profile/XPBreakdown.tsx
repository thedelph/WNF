import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface GameHistory {
  sequence: number;
  status: string;
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
  };
  showTotal?: boolean;
}

const XPBreakdown: React.FC<XPBreakdownProps> = ({ stats, showTotal = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Debug logs for reserve data
  useEffect(() => {
    console.log('XPBreakdown stats:', {
      reserveXP: stats.reserveXP,
      reserveCount: stats.reserveCount,
      typeofReserveXP: typeof stats.reserveXP,
      typeofReserveCount: typeof stats.reserveCount,
    });
  }, [stats]);

  // Ensure we have arrays of numbers and use the passed in latestSequence
  const gameHistory = stats.gameHistory || [];
  const latestSequence = stats.latestSequence || 0;

  // Sort sequences by how many games ago they are, excluding only future games
  const sortedHistory = [...gameHistory]
    .filter(game => game.sequence <= latestSequence) // Only exclude future games
    .sort((a, b) => b.sequence - a.sequence);

  // Calculate base XP from game history
  const baseXP = stats.gameHistory.reduce((total, game) => {
    if (game.sequence >= 1 && game.sequence <= 2) return total + 18;
    if (game.sequence >= 3 && game.sequence <= 4) return total + 16;
    if (game.sequence >= 5 && game.sequence <= 9) return total + 14;
    if (game.sequence >= 10 && game.sequence <= 19) return total + 12;
    if (game.sequence >= 20) return total + 10;
    return total;
  }, 0);

  // Calculate streak multipliers (can't have both)
  const attendanceMultiplier = stats.currentStreak * 0.1; // 10% per game
  const reserveMultiplier = stats.reserveCount * 0.05; // 5% per game
  const streakMultiplier = Math.max(attendanceMultiplier, reserveMultiplier);

  // Calculate final XP
  const finalXP = Math.floor((baseXP + (stats.reserveXP || 0)) * (1 + streakMultiplier));

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
                      <div className="text-sm opacity-70 mb-4">
                        <p>XP is calculated based on how recently you played in historical games:</p>
                        <ul className="list-disc list-inside space-y-1 mt-2">
                          <li>Most Recent Historical Game: 20 XP</li>
                          <li>1-2 Games Ago: 18 XP</li>
                          <li>3-4 Games Ago: 16 XP</li>
                          <li>5-9 Games Ago: 14 XP</li>
                          <li>10-19 Games Ago: 12 XP</li>
                          <li>20-29 Games Ago: 10 XP</li>
                          <li>30-39 Games Ago: 5 XP</li>
                          <li>40+ Games Ago: 0 XP</li>
                          <li>Streak Bonus: Temporary 10% XP for each consecutive game played (resets if you miss a game)</li>
                          <li>Reserve Bonus: +5 XP each time you're a reserve player in the last 40 games</li>
                          <li>Reserve Penalty: -10 XP if you decline an available slot after being selected from reserves. Doesn't apply if the offer is on the day of the game.</li>
                        </ul>
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
                    {sortedHistory.filter(game => game.sequence >= 1 && game.sequence <= 2).length > 0 && (
                      <div className={clsx(
                        "card shadow-sm",
                        "bg-base-100"
                      )}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">Most Recent Game</h5>
                              <p className="text-sm opacity-70 text-base-content/70">20 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">{sortedHistory.filter(game => game.sequence >= 1 && game.sequence <= 2).length * 20} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{sortedHistory.filter(game => game.sequence >= 1 && game.sequence <= 2).length} game{sortedHistory.filter(game => game.sequence >= 1 && game.sequence <= 2).length !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {sortedHistory.filter(game => game.sequence >= 3 && game.sequence <= 4).length > 0 && (
                      <div className={clsx(
                        "card shadow-sm",
                        "bg-base-100"
                      )}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">1-2 Games Ago</h5>
                              <p className="text-sm opacity-70 text-base-content/70">18 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">{sortedHistory.filter(game => game.sequence >= 3 && game.sequence <= 4).length * 18} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{sortedHistory.filter(game => game.sequence >= 3 && game.sequence <= 4).length} game{sortedHistory.filter(game => game.sequence >= 3 && game.sequence <= 4).length !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {sortedHistory.filter(game => game.sequence >= 5 && game.sequence <= 9).length > 0 && (
                      <div className={clsx(
                        "card shadow-sm",
                        "bg-base-100"
                      )}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">3-4 Games Ago</h5>
                              <p className="text-sm opacity-70 text-base-content/70">16 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">{sortedHistory.filter(game => game.sequence >= 5 && game.sequence <= 9).length * 16} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{sortedHistory.filter(game => game.sequence >= 5 && game.sequence <= 9).length} game{sortedHistory.filter(game => game.sequence >= 5 && game.sequence <= 9).length !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {sortedHistory.filter(game => game.sequence >= 10 && game.sequence <= 19).length > 0 && (
                      <div className={clsx(
                        "card shadow-sm",
                        "bg-base-100"
                      )}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">5-9 Games Ago</h5>
                              <p className="text-sm opacity-70 text-base-content/70">14 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">{sortedHistory.filter(game => game.sequence >= 10 && game.sequence <= 19).length * 14} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{sortedHistory.filter(game => game.sequence >= 10 && game.sequence <= 19).length} game{sortedHistory.filter(game => game.sequence >= 10 && game.sequence <= 19).length !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {sortedHistory.filter(game => game.sequence >= 20).length > 0 && (
                      <div className={clsx(
                        "card shadow-sm",
                        "bg-base-100"
                      )}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">10-19 Games Ago</h5>
                              <p className="text-sm opacity-70 text-base-content/70">12 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">{sortedHistory.filter(game => game.sequence >= 20).length * 12} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{sortedHistory.filter(game => game.sequence >= 20).length} game{sortedHistory.filter(game => game.sequence >= 20).length !== 1 ? 's' : ''}</div>
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
                              ({baseXP} + {stats.reserveXP || 0}) × {(1 + streakMultiplier).toFixed(2)}
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
