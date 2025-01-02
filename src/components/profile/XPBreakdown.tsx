import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface XPBreakdownProps {
  stats: {
    caps: number;
    activeBonuses: number;
    activePenalties: number;
    currentStreak: number;
    xp: number;
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
  const calculatedXP = Math.round(baseXP * streakMultiplier);

  // Use database XP for total, but show breakdown based on current game sequences
  const totalXP = stats.xp;

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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">XP Calculation Breakdown</h3>
              
              <div className="space-y-2">
                <h4 className="font-medium">Base XP from Games:</h4>
                <div className="ml-4 space-y-1">
                  {gameCounts.current > 0 && (
                    <p>Current Game (20 XP each): {categoryXP.current} XP</p>
                  )}
                  {gameCounts.recent > 0 && (
                    <p>Recent Games (18 XP each): {categoryXP.recent} XP</p>
                  )}
                  {gameCounts.newer > 0 && (
                    <p>Newer Games (16 XP each): {categoryXP.newer} XP</p>
                  )}
                  {gameCounts.mid > 0 && (
                    <p>Mid Games (14 XP each): {categoryXP.mid} XP</p>
                  )}
                  {gameCounts.older > 0 && (
                    <p>Older Games (12 XP each): {categoryXP.older} XP</p>
                  )}
                  {gameCounts.oldest > 0 && (
                    <p>Oldest Games (10 XP each): {categoryXP.oldest} XP</p>
                  )}
                </div>

                <div className="pt-2">
                  <p>Base XP Total: {baseXP} XP</p>
                  <p>Streak Multiplier: {(streakMultiplier * 100).toFixed(0)}%</p>
                  {showTotal && <p className="font-semibold mt-2">Total XP: {totalXP} XP</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
