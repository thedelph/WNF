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
        className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2"
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
              <h3 className="text-lg font-semibold mb-4">XP Calculation Breakdown</h3>
              
              {/* Base XP from Games */}
              <div className="space-y-2 mb-4">
                <h4 className="font-medium text-primary">Base XP from Games: {baseXP}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {gameBreakdown.last > 0 && (
                    <div className="flex justify-between">
                      <span>Last Game (20 XP):</span>
                      <span className="font-mono">{gameBreakdown.last}</span>
                    </div>
                  )}
                  {gameBreakdown.recent > 0 && (
                    <div className="flex justify-between">
                      <span>Recent Games (18 XP):</span>
                      <span className="font-mono">{gameBreakdown.recent}</span>
                    </div>
                  )}
                  {gameBreakdown.newer > 0 && (
                    <div className="flex justify-between">
                      <span>Newer Games (16 XP):</span>
                      <span className="font-mono">{gameBreakdown.newer}</span>
                    </div>
                  )}
                  {gameBreakdown.mid > 0 && (
                    <div className="flex justify-between">
                      <span>Mid Games (14 XP):</span>
                      <span className="font-mono">{gameBreakdown.mid}</span>
                    </div>
                  )}
                  {gameBreakdown.older > 0 && (
                    <div className="flex justify-between">
                      <span>Older Games (12 XP):</span>
                      <span className="font-mono">{gameBreakdown.older}</span>
                    </div>
                  )}
                  {gameBreakdown.oldest > 0 && (
                    <div className="flex justify-between">
                      <span>Oldest Games (10 XP):</span>
                      <span className="font-mono">{gameBreakdown.oldest}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Multipliers and Modifiers */}
              <div className="space-y-2 mb-4">
                <h4 className="font-medium text-primary">Multipliers & Modifiers</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Streak Multiplier:</span>
                    <span className="font-mono">x{streakMultiplier.toFixed(1)}</span>
                  </div>
                  {bonusXP > 0 && (
                    <div className="flex justify-between">
                      <span>Active Bonuses:</span>
                      <span className="font-mono text-success">+{bonusXP}</span>
                    </div>
                  )}
                  {penaltyXP > 0 && (
                    <div className="flex justify-between">
                      <span>Active Penalties:</span>
                      <span className="font-mono text-error">-{penaltyXP}</span>
                    </div>
                  )}
                  {dropoutXP > 0 && (
                    <div className="flex justify-between">
                      <span>Dropout Penalties:</span>
                      <span className="font-mono text-error">-{dropoutXP}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Final Calculation */}
              <div className="pt-4 border-t border-base-300">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total XP:</span>
                  <span className="font-mono text-lg text-primary">{totalXP}</span>
                </div>
                <p className="text-xs text-base-content/70 mt-2">
                  Formula: (Base XP × Streak Multiplier) + Bonuses - Penalties
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
