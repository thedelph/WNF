/**
 * useVideoPlaybackScore - Computes running score from goal timestamps as video plays
 * Polls getCurrentTime every 500ms and counts goals that have occurred up to that point.
 * Handles seeking backward correctly by recomputing from scratch each tick.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface GoalInput {
  scorerName: string | null;
  scorerTeam: 'blue' | 'orange' | null;
  timestampSeconds: number;
  isOwnGoal: boolean;
  isPenalty: boolean;
  assisterName?: string | null;
}

export interface LatestGoalInfo {
  scorerName: string | null;
  scorerTeam: 'blue' | 'orange' | null;
  assisterName: string | null;
  isOwnGoal: boolean;
  isPenalty: boolean;
  timestampSeconds: number;
}

export interface PlaybackScore {
  blueScore: number;
  orangeScore: number;
  /** Which team scored the most recent goal (for flash animation) */
  latestGoalTeam: 'blue' | 'orange' | null;
  /** Timestamp of the most recent goal (used as animation key) */
  latestGoalTimestamp: number | null;
  /** Full info about the most recent goal (for scorer banner) */
  latestGoal: LatestGoalInfo | null;
  currentTime: number;
}

export function useVideoPlaybackScore(
  getCurrentTime: (() => number | null) | null,
  goals: GoalInput[],
  enabled: boolean
): PlaybackScore {
  const [score, setScore] = useState<PlaybackScore>({
    blueScore: 0,
    orangeScore: 0,
    latestGoalTeam: null,
    latestGoalTimestamp: null,
    latestGoal: null,
    currentTime: 0,
  });

  // Keep a sorted copy of goals for efficient iteration
  const sortedGoalsRef = useRef<GoalInput[]>([]);
  useEffect(() => {
    sortedGoalsRef.current = [...goals].sort(
      (a, b) => a.timestampSeconds - b.timestampSeconds
    );
  }, [goals]);

  const compute = useCallback((time: number): PlaybackScore => {
    let blue = 0;
    let orange = 0;
    let lastTeam: 'blue' | 'orange' | null = null;
    let lastTs: number | null = null;
    let lastGoal: GoalInput | null = null;

    for (const goal of sortedGoalsRef.current) {
      if (goal.timestampSeconds <= time) {
        if (goal.scorerTeam === 'blue') {
          blue++;
          lastTeam = 'blue';
          lastTs = goal.timestampSeconds;
          lastGoal = goal;
        } else if (goal.scorerTeam === 'orange') {
          orange++;
          lastTeam = 'orange';
          lastTs = goal.timestampSeconds;
          lastGoal = goal;
        }
      }
    }

    return {
      blueScore: blue,
      orangeScore: orange,
      latestGoalTeam: lastTeam,
      latestGoalTimestamp: lastTs,
      latestGoal: lastGoal
        ? {
            scorerName: lastGoal.scorerName,
            scorerTeam: lastGoal.scorerTeam,
            assisterName: lastGoal.assisterName ?? null,
            isOwnGoal: lastGoal.isOwnGoal,
            isPenalty: lastGoal.isPenalty,
            timestampSeconds: lastGoal.timestampSeconds,
          }
        : null,
      currentTime: time,
    };
  }, []);

  useEffect(() => {
    if (!enabled || !getCurrentTime) return;

    const interval = setInterval(() => {
      const time = getCurrentTime();
      if (time === null) return;

      setScore((prev) => {
        const next = compute(time);
        // Avoid unnecessary re-renders if nothing changed
        if (
          prev.blueScore === next.blueScore &&
          prev.orangeScore === next.orangeScore &&
          prev.latestGoalTimestamp === next.latestGoalTimestamp &&
          Math.abs(prev.currentTime - next.currentTime) < 1
        ) {
          return prev;
        }
        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [enabled, getCurrentTime, compute]);

  return score;
}
