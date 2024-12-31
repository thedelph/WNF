import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculatePlayerXP } from '../../utils/xpCalculations';

interface XPBreakdownProps {
  stats: {
    caps: number;
    activeBonuses: number;
    activePenalties: number;
    currentStreak: number;
    dropoutPenalties?: number;
    gameSequences?: string[];
  };
}

export default function XPBreakdown({ stats }: XPBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate base XP for each game tier
  const gameSequences = stats.gameSequences?.map(seq => parseInt(seq)) || Array.from({ length: stats.caps }, (_, i) => i + 1);
  const gameBreakdown = gameSequences.reduce((acc, _, index) => {
    if (index === 0) acc.last += 20;        // Last game: 20 points
    else if (index < 3) acc.recent += 18;    // Games 2-3: 18 points
    else if (index < 5) acc.newer += 16;     // Games 4-5: 16 points
    else if (index < 10) acc.mid += 14;      // Games 6-10: 14 points
    else if (index < 20) acc.older += 12;    // Games 11-20: 12 points
    else acc.oldest += 10;                   // Games 20+: 10 points
    return acc;
  }, { last: 0, recent: 0, newer: 0, mid: 0, older: 0, oldest: 0 });

  // Calculate game counts for each tier
  const gameCounts = {
    last: gameBreakdown.last > 0 ? 1 : 0,
    recent: Math.ceil(gameBreakdown.recent / 18),
    newer: Math.ceil(gameBreakdown.newer / 16),
    mid: Math.ceil(gameBreakdown.mid / 14),
    older: Math.ceil(gameBreakdown.older / 12),
    oldest: Math.ceil(gameBreakdown.oldest / 10)
  };

  const baseXP = Object.values(gameBreakdown).reduce((a, b) => a + b, 0);
  const streakMultiplier = 1 + (stats.currentStreak * 0.1);
  const bonusXP = stats.activeBonuses * 100;
  const penaltyXP = stats.activePenalties * 100;
  const dropoutXP = (stats.dropoutPenalties || 0) * 50;
  const totalXP = Math.max(0, Math.round((baseXP * streakMultiplier) + bonusXP - penaltyXP - dropoutXP));

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
              
              {/* Base XP from Games */}
              <div className="space-y-4 mb-6">
                <h4 className="font-medium text-primary border-b border-base-300 pb-2">
                  Game Points ({baseXP} Total Base XP)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gameBreakdown.last > 0 && (
                    <div className="card bg-base-100 shadow-sm">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium">Most Recent Game</h5>
                            <p className="text-sm opacity-70">20 XP per game</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg">{gameBreakdown.last} XP</div>
                            <div className="text-xs opacity-70">{gameCounts.last} game</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {gameBreakdown.recent > 0 && (
                    <div className="card bg-base-100 shadow-sm">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium">Games 2-3</h5>
                            <p className="text-sm opacity-70">18 XP per game</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg">{gameBreakdown.recent} XP</div>
                            <div className="text-xs opacity-70">{gameCounts.recent} games</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {gameBreakdown.newer > 0 && (
                    <div className="card bg-base-100 shadow-sm">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium">Games 4-5</h5>
                            <p className="text-sm opacity-70">16 XP per game</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg">{gameBreakdown.newer} XP</div>
                            <div className="text-xs opacity-70">{gameCounts.newer} games</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {gameBreakdown.mid > 0 && (
                    <div className="card bg-base-100 shadow-sm">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium">Games 6-10</h5>
                            <p className="text-sm opacity-70">14 XP per game</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg">{gameBreakdown.mid} XP</div>
                            <div className="text-xs opacity-70">{gameCounts.mid} games</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {gameBreakdown.older > 0 && (
                    <div className="card bg-base-100 shadow-sm">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium">Games 11-20</h5>
                            <p className="text-sm opacity-70">12 XP per game</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg">{gameBreakdown.older} XP</div>
                            <div className="text-xs opacity-70">{gameCounts.older} games</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {gameBreakdown.oldest > 0 && (
                    <div className="card bg-base-100 shadow-sm">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium">Games 20+</h5>
                            <p className="text-sm opacity-70">10 XP per game</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg">{gameBreakdown.oldest} XP</div>
                            <div className="text-xs opacity-70">{gameCounts.oldest} games</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Multipliers and Modifiers */}
              <div className="space-y-4 mb-6">
                <h4 className="font-medium text-primary border-b border-base-300 pb-2">
                  Bonuses & Penalties
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="card bg-base-100 shadow-sm">
                    <div className="card-body p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-medium">Attendance Streak Bonus</h5>
                          <p className="text-sm opacity-70">Current streak: {stats.currentStreak}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg">×{streakMultiplier.toFixed(1)}</div>
                          <div className="text-xs opacity-70">multiplier</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {bonusXP > 0 && (
                    <div className="card bg-success text-success-content shadow-sm">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium">Active Bonuses</h5>
                            <p className="text-sm opacity-70">{stats.activeBonuses} active</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg">+{bonusXP}</div>
                            <div className="text-xs opacity-70">bonus XP</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {penaltyXP > 0 && (
                    <div className="card bg-error text-error-content shadow-sm">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium">Active Penalties</h5>
                            <p className="text-sm opacity-70">{stats.activePenalties} active</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg">-{penaltyXP}</div>
                            <div className="text-xs opacity-70">penalty XP</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {dropoutXP > 0 && (
                    <div className="card bg-error text-error-content shadow-sm">
                      <div className="card-body p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="font-medium">Dropout Penalties</h5>
                            <p className="text-sm opacity-70">{stats.dropoutPenalties} penalties</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-lg">-{dropoutXP}</div>
                            <div className="text-xs opacity-70">penalty XP</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Final Calculation */}
              <div className="card bg-primary text-primary-content">
                <div className="card-body p-4">
                  <h3 className="card-title">Total XP: {totalXP}</h3>
                  <p className="text-sm opacity-90">
                    Base {baseXP} × {streakMultiplier.toFixed(1)} streak multiplier
                    {bonusXP > 0 ? ` + ${bonusXP} bonus` : ''}
                    {penaltyXP > 0 ? ` - ${penaltyXP} penalties` : ''}
                    {dropoutXP > 0 ? ` - ${dropoutXP} dropout penalties` : ''}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
