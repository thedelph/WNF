import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculatePlayerXP } from '../../utils/xpCalculations';

interface XPBreakdownProps {
  stats: {
    caps: number;
    activeBonuses: number;
    activePenalties: number;
    currentStreak: number;
    gameSequences?: number[];
    latestSequence?: number;
  };
  showTotal?: boolean;
}

export default function XPBreakdown({ 
  stats,
  showTotal = true 
}: XPBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Ensure we have arrays of numbers and use the passed in latestSequence
  const sequences = stats.gameSequences || [];
  const latestSequence = stats.latestSequence || 0;

  // Calculate XP breakdown
  const xpBreakdown = calculatePlayerXP({
    caps: stats.caps,
    activeBonuses: stats.activeBonuses,
    activePenalties: stats.activePenalties,
    currentStreak: stats.currentStreak,
    gameSequences: sequences,
    latestSequence
  });

  // Sort sequences by how many games ago they are
  const sortedSequences = [...sequences]
    .filter(seq => seq <= latestSequence) // Only include historical games
    .sort((a, b) => b - a);
    
  const gameCategories = sortedSequences.reduce((acc, sequence) => {
    const gamesAgo = latestSequence - sequence;
    
    if (gamesAgo === 0) {
      acc.current.push(sequence);
    } else if (gamesAgo <= 2) {
      acc.recent.push(sequence);
    } else if (gamesAgo <= 4) {
      acc.newer.push(sequence);
    } else if (gamesAgo <= 9) {
      acc.mid.push(sequence);
    } else if (gamesAgo <= 19) {
      acc.older.push(sequence);
    } else {
      acc.oldest.push(sequence);
    }
    
    return acc;
  }, {
    current: [] as number[],
    recent: [] as number[],
    newer: [] as number[],
    mid: [] as number[],
    older: [] as number[],
    oldest: [] as number[]
  });

  const gameCounts = {
    current: gameCategories.current.length,
    recent: gameCategories.recent.length,
    newer: gameCategories.newer.length,
    mid: gameCategories.mid.length,
    older: gameCategories.older.length,
    oldest: gameCategories.oldest.length
  };

  const categoryXP = {
    current: gameCounts.current * 20,
    recent: gameCounts.recent * 18,
    newer: gameCounts.newer * 16,
    mid: gameCounts.mid * 14,
    older: gameCounts.older * 12,
    oldest: gameCounts.oldest * 10
  };

  const baseXP = Object.values(categoryXP).reduce((sum, xp) => sum + xp, 0);
  const streakMultiplier = 1 + (stats.currentStreak * 0.1);
  const totalXP = Math.round(baseXP * streakMultiplier);

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <span className="inline-flex items-center justify-center w-4 h-4">ℹ️</span>
        <span className="font-medium">XP BREAKDOWN</span>
      </button>

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
              <h3 className="text-lg font-semibold mb-4">How Your XP is Calculated</h3>
              
              <div className="space-y-4">
                <div className="text-sm opacity-70 mb-4">
                  <p>XP is calculated based on how recently you played in historical games:</p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Most Recent Historical Game: 20 XP</li>
                    <li>1-2 Games Ago: 18 XP</li>
                    <li>3-4 Games Ago: 16 XP</li>
                    <li>5-9 Games Ago: 14 XP</li>
                    <li>10-19 Games Ago: 12 XP</li>
                    <li>20+ Games Ago: 10 XP</li>
                  </ul>
                </div>

                {/* Base XP from Games */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-medium text-primary border-b border-base-300 pb-2">
                    Game Points ({baseXP} Total Base XP)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {gameCounts.current > 0 && (
                      <div className="card bg-base-100 shadow-sm">
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium">Most Recent Game</h5>
                              <p className="text-sm opacity-70">20 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg">{categoryXP.current} XP</div>
                              <div className="text-xs opacity-70">{gameCounts.current} game{gameCounts.current !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.recent > 0 && (
                      <div className="card bg-base-100 shadow-sm">
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium">1-2 Games Ago</h5>
                              <p className="text-sm opacity-70">18 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg">{categoryXP.recent} XP</div>
                              <div className="text-xs opacity-70">{gameCounts.recent} game{gameCounts.recent !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.newer > 0 && (
                      <div className="card bg-base-100 shadow-sm">
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium">3-4 Games Ago</h5>
                              <p className="text-sm opacity-70">16 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg">{categoryXP.newer} XP</div>
                              <div className="text-xs opacity-70">{gameCounts.newer} game{gameCounts.newer !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.mid > 0 && (
                      <div className="card bg-base-100 shadow-sm">
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium">5-9 Games Ago</h5>
                              <p className="text-sm opacity-70">14 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg">{categoryXP.mid} XP</div>
                              <div className="text-xs opacity-70">{gameCounts.mid} game{gameCounts.mid !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.older > 0 && (
                      <div className="card bg-base-100 shadow-sm">
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium">10-19 Games Ago</h5>
                              <p className="text-sm opacity-70">12 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg">{categoryXP.older} XP</div>
                              <div className="text-xs opacity-70">{gameCounts.older} game{gameCounts.older !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameCounts.oldest > 0 && (
                      <div className="card bg-base-100 shadow-sm">
                        <div className="card-body p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium">20+ Games Ago</h5>
                              <p className="text-sm opacity-70">10 XP per game</p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-lg">{categoryXP.oldest} XP</div>
                              <div className="text-xs opacity-70">{gameCounts.oldest} game{gameCounts.oldest !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Streak Multiplier */}
                <div>
                  <h4 className="font-medium text-primary border-b border-base-300 pb-2 mb-4">
                    Streak Multiplier
                  </h4>
                  <div className="card bg-base-100 shadow-sm">
                    <div className="card-body p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-medium">Current Streak: {stats.currentStreak}</h5>
                          <p className="text-sm opacity-70">+10% XP per streak level</p>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg">{(streakMultiplier * 100 - 100).toFixed(0)}% Bonus</div>
                          <div className="text-xs opacity-70">{streakMultiplier.toFixed(1)}x Multiplier</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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
                            <p className="text-sm opacity-70">Base XP × Streak Multiplier</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-2xl">{totalXP} XP</div>
                            <div className="text-xs opacity-70">{baseXP} × {streakMultiplier.toFixed(1)}</div>
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