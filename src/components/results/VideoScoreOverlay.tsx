/**
 * VideoScoreOverlay - Broadcast-style running scoreboard overlay
 * Positioned on top of the YouTube video player with pointer-events: none
 * so all clicks pass through to the video controls underneath.
 * Shows a brief goal notification with scorer + assist info when a goal occurs.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LatestGoalInfo } from '../../hooks/useVideoPlaybackScore';

interface VideoScoreOverlayProps {
  blueScore: number;
  orangeScore: number;
  latestGoalTeam: 'blue' | 'orange' | null;
  latestGoalTimestamp: number | null;
  latestGoal: LatestGoalInfo | null;
  visible: boolean;
  teamLeft?: 'blue' | 'orange';
}

/** Duration in ms to show the goal notification */
const GOAL_BANNER_DURATION = 4000;

export const VideoScoreOverlay: React.FC<VideoScoreOverlayProps> = ({
  blueScore,
  orangeScore,
  latestGoalTeam,
  latestGoalTimestamp,
  latestGoal,
  visible,
  teamLeft = 'blue',
}) => {
  const isSwapped = teamLeft === 'orange';
  // Track which goal banner is currently showing (by timestamp key)
  const [visibleBannerKey, setVisibleBannerKey] = useState<string | null>(null);
  const [bannerGoal, setBannerGoal] = useState<LatestGoalInfo | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTimestampRef = useRef<number | null>(null);
  // Ref-ify latestGoal so it doesn't trigger the effect (it's a new object each tick)
  const latestGoalRef = useRef(latestGoal);
  latestGoalRef.current = latestGoal;

  // Show banner when a new goal appears (only fires when latestGoalTimestamp changes)
  useEffect(() => {
    const goal = latestGoalRef.current;
    if (
      latestGoalTimestamp !== null &&
      latestGoalTimestamp !== prevTimestampRef.current &&
      goal
    ) {
      const key = `${latestGoalTimestamp}-${goal.scorerTeam}`;
      setBannerGoal(goal);
      setVisibleBannerKey(key);

      // Clear any existing timer
      if (timerRef.current) clearTimeout(timerRef.current);

      // Auto-hide after duration
      timerRef.current = setTimeout(() => {
        setVisibleBannerKey(null);
      }, GOAL_BANNER_DURATION);
    }
    prevTimestampRef.current = latestGoalTimestamp;
  }, [latestGoalTimestamp]);

  // Clean up timer on unmount only
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-1"
        >
          {/* Scoreboard */}
          <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-white/10 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 sm:gap-3">
            {/* Left team label */}
            <span className={`text-xs sm:text-sm font-medium ${isSwapped ? 'text-orange-400' : 'text-blue-400'}`}>
              {isSwapped ? 'Orange' : 'Blue'}
            </span>

            {/* Left team score */}
            <ScoreDigit
              score={isSwapped ? orangeScore : blueScore}
              flash={isSwapped ? latestGoalTeam === 'orange' : latestGoalTeam === 'blue'}
              flashKey={isSwapped ? (latestGoalTeam === 'orange' ? latestGoalTimestamp : null) : (latestGoalTeam === 'blue' ? latestGoalTimestamp : null)}
              color={isSwapped ? 'text-orange-300' : 'text-blue-300'}
            />

            {/* Separator */}
            <span className="text-xs sm:text-sm text-white/50 font-light">
              -
            </span>

            {/* Right team score */}
            <ScoreDigit
              score={isSwapped ? blueScore : orangeScore}
              flash={isSwapped ? latestGoalTeam === 'blue' : latestGoalTeam === 'orange'}
              flashKey={isSwapped ? (latestGoalTeam === 'blue' ? latestGoalTimestamp : null) : (latestGoalTeam === 'orange' ? latestGoalTimestamp : null)}
              color={isSwapped ? 'text-blue-300' : 'text-orange-300'}
            />

            {/* Right team label */}
            <span className={`text-xs sm:text-sm font-medium ${isSwapped ? 'text-blue-400' : 'text-orange-400'}`}>
              {isSwapped ? 'Blue' : 'Orange'}
            </span>
          </div>

          {/* Goal notification banner */}
          <AnimatePresence>
            {visibleBannerKey && bannerGoal && (
              <GoalBanner key={visibleBannerKey} goal={bannerGoal} />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/** Brief goal notification that slides in and fades out */
const GoalBanner: React.FC<{ goal: LatestGoalInfo }> = ({ goal }) => {
  const teamColor =
    goal.scorerTeam === 'blue' ? 'border-blue-400/40' : 'border-orange-400/40';
  const teamTextColor =
    goal.scorerTeam === 'blue' ? 'text-blue-300' : 'text-orange-300';

  const scorerLabel = goal.scorerName ?? 'Unknown';
  const suffix = goal.isOwnGoal ? ' (OG)' : goal.isPenalty ? ' (P)' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`bg-black/75 backdrop-blur-sm rounded-md border ${teamColor} px-3 py-1 sm:px-4 sm:py-1.5 text-center`}
    >
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[10px] sm:text-xs text-white/80">GOAL</span>
        <span className={`text-xs sm:text-sm font-semibold ${teamTextColor}`}>
          {scorerLabel}
          {suffix && (
            <span className="text-white/50 font-normal text-[10px] sm:text-xs ml-0.5">
              {suffix}
            </span>
          )}
        </span>
      </div>
      {goal.assisterName && (
        <div className="text-[10px] sm:text-xs text-white/50 -mt-0.5">
          Assist: {goal.assisterName}
        </div>
      )}
    </motion.div>
  );
};

/** Animated score digit with flash on goal */
const ScoreDigit: React.FC<{
  score: number;
  flash: boolean;
  flashKey: number | null;
  color: string;
}> = ({ score, flash, flashKey, color }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={flash ? `${flashKey}` : `static-${score}`}
        initial={flash ? { scale: 1.6, color: '#ffffff' } : { scale: 1 }}
        animate={{ scale: 1, color: undefined }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`text-sm sm:text-lg font-bold tabular-nums ${color}`}
      >
        {score}
      </motion.span>
    </AnimatePresence>
  );
};

export default VideoScoreOverlay;
