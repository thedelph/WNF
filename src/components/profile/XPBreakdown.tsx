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
    benchWarmerStreak?: number;
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

  // Calculate base XP from game history without multipliers
  const baseXP = stats.gameHistory.reduce((total, game) => {
    // Calculate how many games ago this game was
    const gamesAgo = latestSequence - game.sequence;
    
    // Get base XP for this game
    let gameXP = 0;
    if (gamesAgo === 0) gameXP = 20;  // Most recent game
    else if (gamesAgo <= 2) gameXP = 18;   // 1-2 games ago
    else if (gamesAgo <= 4) gameXP = 16;   // 3-4 games ago
    else if (gamesAgo <= 9) gameXP = 14;   // 5-9 games ago
    else if (gamesAgo <= 19) gameXP = 12;  // 10-19 games ago
    else if (gamesAgo <= 29) gameXP = 10;  // 20-29 games ago
    else if (gamesAgo <= 39) gameXP = 5;   // 30-39 games ago
    else gameXP = 0;  // 40+ games ago: 0 XP

    return total + gameXP;
  }, 0);

  // Add reserve XP if any
  const totalBaseXP = baseXP + (stats.reserveXP || 0);

  // Calculate streak multiplier (+10% per streak level)
  const attendanceMultiplier = 1 + (stats.currentStreak * 0.1);
  
  // Calculate bench warmer multiplier (+5% per bench warmer streak level)
  const reserveMultiplier = 1 + ((stats.benchWarmerStreak || 0) * 0.05);

  // Apply both multipliers to the total base XP
  const finalXP = Math.round(totalBaseXP * attendanceMultiplier * reserveMultiplier);

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
                          <li>Reserve XP: +5 XP each time you're a reserve player in the last 40 games</li>
                          <li>Attendance Streak: Temporary +10% XP for each consecutive game played (resets if you miss a game)</li>
                          <li>Bench Warmer Streak: Temporary +5% XP for each game where you're a reserve that doesn't get an opportunity to play (resets when you either play or miss a game)</li>
                          <li>Reserve Penalty: -10 XP if you decline an available slot from someone who dropped out. To prevent people trying to just get free XP. Doesn't apply if the drop out occurs on the day of the game.</li>
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

                    {/* 1-2 Games Ago - 18 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 1 && gamesAgo <= 2;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">1-2 Games Ago</h5>
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

                    {/* 3-4 Games Ago - 16 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 3 && gamesAgo <= 4;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">3-4 Games Ago</h5>
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

                    {/* 5-9 Games Ago - 14 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 5 && gamesAgo <= 9;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">5-9 Games Ago</h5>
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

                    {/* 10-19 Games Ago - 12 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 10 && gamesAgo <= 19;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">10-19 Games Ago</h5>
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

                    {/* 20-29 Games Ago - 10 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 20 && gamesAgo <= 29;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">20-29 Games Ago</h5>
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

                    {/* 30-39 Games Ago - 5 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 30 && gamesAgo <= 39;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">30-39 Games Ago</h5>
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

                    {/* 40+ Games Ago - 0 XP */}
                    {sortedHistory.filter(game => {
                      const gamesAgo = latestSequence - game.sequence;
                      return gamesAgo >= 40;
                    }).length > 0 && (
                      <div className={clsx("card shadow-sm", "bg-base-100")}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">40+ Games Ago</h5>
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
                              ({baseXP} + {stats.reserveXP || 0})
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
