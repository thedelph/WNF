/**
 * VideoPlayer - Responsive YouTube embed for game recordings
 * Uses YouTube IFrame Player API for playback control + timestamp reading
 * Supports seeking to timestamps and exposes getCurrentTime for highlight forms
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, Clock, Eye, EyeOff } from 'lucide-react';
import { extractYouTubeId, formatTimestamp } from '../../utils/youtube';
import { useVideoPlaybackScore } from '../../hooks/useVideoPlaybackScore';
import { VideoScoreOverlay } from './VideoScoreOverlay';
import type { GoalInfo } from './ScoreHero';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface YTPlayer {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getPlayerState: () => number;
  destroy: () => void;
}

// Singleton: load the YT IFrame API script once
let ytApiLoaded = false;
let ytApiReady = false;
const ytReadyCallbacks: (() => void)[] = [];

function loadYouTubeApi(): Promise<void> {
  if (ytApiReady) return Promise.resolve();

  return new Promise((resolve) => {
    ytReadyCallbacks.push(resolve);

    if (ytApiLoaded) return; // script already injected, just wait
    ytApiLoaded = true;

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      ytApiReady = true;
      ytReadyCallbacks.forEach((cb) => cb());
      ytReadyCallbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
}

interface VideoPlayerProps {
  youtubeUrl: string;
  title?: string;
  seekToSeconds?: number;
  /** Incrementing key that forces a re-seek even to the same timestamp */
  seekKey?: number;
  /** Called once the player is ready; provides a function to read current playback time */
  onPlayerReady?: (getCurrentTime: () => number | null) => void;
  /** Goal highlights for live scoreboard overlay */
  goals?: GoalInfo[];
  /** Which team plays on the left side of the pitch in the video */
  teamLeft?: 'blue' | 'orange';
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  youtubeUrl,
  title = 'Match Video',
  seekToSeconds,
  seekKey,
  onPlayerReady,
  goals = [],
  teamLeft = 'blue',
}) => {
  const videoId = extractYouTubeId(youtubeUrl);
  const playerRef = useRef<YTPlayer | null>(null);
  const containerIdRef = useRef(`yt-player-${Math.random().toString(36).slice(2, 9)}`);
  const onPlayerReadyRef = useRef(onPlayerReady);
  onPlayerReadyRef.current = onPlayerReady;
  const [showOverlay, setShowOverlay] = useState(true);

  const getCurrentTime = useCallback((): number | null => {
    try {
      if (playerRef.current) {
        return Math.floor(playerRef.current.getCurrentTime());
      }
    } catch {
      // player may have been destroyed
    }
    return null;
  }, []);

  const hasGoals = goals.length > 0;
  const playbackScore = useVideoPlaybackScore(getCurrentTime, goals, hasGoals);

  // Initialize the YT player
  useEffect(() => {
    if (!videoId) return;

    let destroyed = false;

    loadYouTubeApi().then(() => {
      if (destroyed) return;

      // Ensure the target div exists
      const el = document.getElementById(containerIdRef.current);
      if (!el) return;

      playerRef.current = new window.YT.Player(containerIdRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          ...(seekToSeconds !== undefined && seekToSeconds > 0 ? { start: seekToSeconds } : {}),
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            onPlayerReadyRef.current?.(getCurrentTime);
          },
        },
      });
    });

    return () => {
      destroyed = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, [videoId]); // only re-create when videoId changes

  // Handle seek requests without remounting — seekKey forces re-seek to same timestamp
  useEffect(() => {
    if (seekToSeconds !== undefined && playerRef.current) {
      try {
        playerRef.current.seekTo(seekToSeconds, true);
      } catch {
        // player not ready yet
      }
    }
  }, [seekKey]);

  if (!videoId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="card bg-base-200 shadow"
    >
      <div className="card-body p-4">
        <h3 className="card-title text-sm font-medium gap-2">
          <Video className="w-4 h-4 text-primary" />
          {title}
          {seekToSeconds !== undefined && seekToSeconds > 0 && (
            <span className="badge badge-sm badge-primary gap-1">
              <Clock className="w-3 h-3" />
              {formatTimestamp(seekToSeconds)}
            </span>
          )}
          {hasGoals && (
            <button
              onClick={() => setShowOverlay((v) => !v)}
              className="ml-auto btn btn-ghost btn-xs gap-1 opacity-70 hover:opacity-100"
              title={showOverlay ? 'Hide live score' : 'Show live score'}
            >
              {showOverlay ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline text-xs">Score</span>
            </button>
          )}
        </h3>
        <div className="aspect-video rounded-lg overflow-hidden bg-black relative">
          <div id={containerIdRef.current} className="w-full h-full" />
          {hasGoals && (
            <VideoScoreOverlay
              blueScore={playbackScore.blueScore}
              orangeScore={playbackScore.orangeScore}
              latestGoalTeam={playbackScore.latestGoalTeam}
              latestGoalTimestamp={playbackScore.latestGoalTimestamp}
              latestGoal={playbackScore.latestGoal}
              visible={showOverlay}
              teamLeft={teamLeft}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default VideoPlayer;
