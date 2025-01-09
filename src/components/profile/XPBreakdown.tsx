import React, { useState } from 'react';
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

  // Ensure we have arrays of numbers and use the passed in latestSequence
  const gameHistory = stats.gameHistory || [];
  const latestSequence = stats.latestSequence || 0;

  // Sort sequences by how many games ago they are, excluding only future games
  const sortedHistory = [...gameHistory]
    .filter(game => game.sequence <= latestSequence) // Only exclude future games
    .sort((a, b) => b.sequence - a.sequence);
    
  // Calculate XP based on difference from latest sequence number
  const gameCategories = sortedHistory.reduce((acc, game) => {
    // Only count selected games for XP
    if (game.status !== 'selected') return acc;

    // Calculate XP based on how many games ago relative to latest sequence
    const gamesAgo = latestSequence - game.sequence;

    if (gamesAgo >= 40) {
      acc.oldest.push(game.sequence);    // 41+ games ago: 0 XP
    } else if (gamesAgo >= 30) {
      acc.older2.push(game.sequence);    // 31-40 games ago: 5 XP
    } else if (gamesAgo >= 20) {
      acc.older1.push(game.sequence);    // 20-30 games ago: 10 XP
    } else if (gamesAgo >= 10) {
      acc.older.push(game.sequence);     // 10-19 games ago: 12 XP
    } else if (gamesAgo >= 5) {
      acc.mid.push(game.sequence);       // 5-9 games ago: 14 XP
    } else if (gamesAgo >= 3) {
      acc.newer.push(game.sequence);     // 3-4 games ago: 16 XP
    } else if (gamesAgo >= 1) {
      acc.recent.push(game.sequence);    // 1-2 games ago: 18 XP
    } else {
      acc.current.push(game.sequence);   // Current game (0 games ago): 20 XP
    }
    return acc;
  }, {
    current: [] as number[],
    recent: [] as number[],
    newer: [] as number[],
    mid: [] as number[],
    older: [] as number[],
    older1: [] as number[],
    older2: [] as number[],
    oldest: [] as number[]
  });

  const gameCounts = {
    current: gameCategories.current.length,
    recent: gameCategories.recent.length,
    newer: gameCategories.newer.length,
    mid: gameCategories.mid.length,
    older: gameCategories.older.length,
    older1: gameCategories.older1.length,
    older2: gameCategories.older2.length,
    oldest: gameCategories.oldest.length
  };

  // Calculate XP for each category
  const categoryXP = {
    current: gameCounts.current * 20,  // Most recent game
    recent: gameCounts.recent * 18,    // 1-2 games ago
    newer: gameCounts.newer * 16,      // 3-4 games ago
    mid: gameCounts.mid * 14,          // 5-9 games ago
    older: gameCounts.older * 12,      // 10-19 games ago
    older1: gameCounts.older1 * 10,    // 20-30 games ago
    older2: gameCounts.older2 * 5,     // 31-40 games ago
    oldest: gameCounts.oldest * 0      // 41+ games ago
  };

  const baseXP = Object.values(categoryXP).reduce((sum, xp) => sum + xp, 0);

  const streakMultiplier = 1 + (stats.currentStreak * 0.1);
  const streakBonus = Math.floor(baseXP * (streakMultiplier - 1));

  // Animation variants
  const contentVariants = {
    collapsed: { height: 0, opacity: 0 },
    expanded: { height: "auto", opacity: 1 }
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
                    <li>20-30 Games Ago: 10 XP</li>
                    <li>31-40 Games Ago: 5 XP</li>
                    <li>41+ Games Ago: 0 XP</li>
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
                    {gameCounts.current > 0 && (
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
                              <div className="font-mono text-lg font-bold text-base-content">{categoryXP.current} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{gameCounts.current} game{gameCounts.current !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.recent > 0 && (
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
                              <div className="font-mono text-lg font-bold text-base-content">{categoryXP.recent} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{gameCounts.recent} game{gameCounts.recent !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.newer > 0 && (
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
                              <div className="font-mono text-lg font-bold text-base-content">{categoryXP.newer} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{gameCounts.newer} game{gameCounts.newer !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.mid > 0 && (
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
                              <div className="font-mono text-lg font-bold text-base-content">{categoryXP.mid} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{gameCounts.mid} game{gameCounts.mid !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.older > 0 && (
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
                              <div className="font-mono text-lg font-bold text-base-content">{categoryXP.older} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{gameCounts.older} game{gameCounts.older !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.older1 > 0 && (
                      <div className={clsx(
                        "card shadow-sm",
                        "bg-base-100"
                      )}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">20-30 Games Ago</h5>
                              <p className="text-sm opacity-70 text-base-content/70">10 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">{categoryXP.older1} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{gameCounts.older1} game{gameCounts.older1 !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.older2 > 0 && (
                      <div className={clsx(
                        "card shadow-sm",
                        "bg-base-100"
                      )}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">31-40 Games Ago</h5>
                              <p className="text-sm opacity-70 text-base-content/70">5 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">{categoryXP.older2} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{gameCounts.older2} game{gameCounts.older2 !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.oldest > 0 && (
                      <div className={clsx(
                        "card shadow-sm",
                        "bg-base-100"
                      )}>
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-base-content">41+ Games Ago</h5>
                              <p className="text-sm opacity-70 text-base-content/70">0 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg font-bold text-base-content">{categoryXP.oldest} XP</div>
                              <div className="text-xs opacity-70 text-base-content/70">{gameCounts.oldest} game{gameCounts.oldest !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reserve XP if any */}
                {stats.reserveXP !== undefined && stats.reserveXP !== 0 && (
                  <div className="space-y-4 mb-6">
                    <h4 className="font-medium text-primary border-b border-base-300 pb-2">
                      Reserve XP
                    </h4>
                    <div className={clsx(
                      "card shadow-sm",
                      stats.reserveXP > 0 ? "bg-success/10" : "bg-error/10"
                    )}>
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className={clsx(
                              "font-medium",
                              stats.reserveXP > 0 ? "text-success-content" : "text-error-content"
                            )}>
                              {stats.reserveXP > 0 ? 'Reserve Bonus' : 'Reserve Penalty'}
                            </h5>
                            <p className={clsx(
                              "text-sm",
                              stats.reserveXP > 0 ? "text-success-content/70" : "text-error-content/70"
                            )}>
                              {stats.reserveXP > 0 ? `For being a reserve (${stats.reserveCount || 0} ${(stats.reserveCount || 0) === 1 ? 'time' : 'times'})` : 'For declining slots'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={clsx(
                              "font-mono text-lg font-bold",
                              stats.reserveXP > 0 ? "text-success" : "text-error"
                            )}>
                              {stats.reserveXP > 0 ? '+' : ''}{stats.reserveXP} XP
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Streak Multiplier */}
                {stats.currentStreak > 0 && (
                  <div className="space-y-4 mb-6">
                    <h4 className="font-medium text-primary border-b border-base-300 pb-2">
                      Streak Bonus
                    </h4>
                    <div className="card shadow-sm bg-success/10">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium text-success-content">
                              Attendance Streak
                            </h5>
                            <p className="text-sm text-success-content/70">
                              {stats.currentStreak} consecutive {stats.currentStreak === 1 ? 'game' : 'games'} attended
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg font-bold text-success">
                              +{(streakMultiplier * 100 - 100).toFixed(0)}% XP
                            </div>
                            <div className="text-xs text-success-content/70">
                              {streakMultiplier.toFixed(1)}x Multiplier
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total XP */}
                {showTotal && (
                  <div>
                    <h4 className="font-medium text-primary border-b border-base-300 pb-2 mb-4">
                      Total XP
                    </h4>
                    <div className="card bg-base-100 shadow-sm">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium">Final XP</h5>
                            <p className="text-sm opacity-70">Including Streak & Reserve XP</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-2xl">{stats.xp}</span>
                              <span className="text-2xl">XP</span>
                            </div>
                            <div className="text-xs opacity-70">
                              ({baseXP} × {streakMultiplier.toFixed(1)})
                              {stats.reserveXP ? ` ${stats.reserveXP > 0 ? '+' : '-'} ${Math.abs(stats.reserveXP)}` : ''}
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
