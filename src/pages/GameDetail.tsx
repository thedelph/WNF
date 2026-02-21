/**
 * GameDetail Page - Individual game result with Sky Sports-style match report
 * Shows score hero, game metadata, insights, and team rosters
 * Auto-generates insights for completed games that don't have them
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Users, Trophy, Sparkles, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGameDetail } from '../hooks/useGameDetail';
import { usePostMatchAnalysis } from '../hooks/usePostMatchAnalysis';
import { formatDate } from '../utils/dateUtils';
import { ScoreHero } from '../components/results/ScoreHero';
import { MatchSummary } from '../components/results/MatchSummary';
import { InsightsSection } from '../components/results/InsightsSection';
import { HighlightsSection } from '../components/results/HighlightsSection';
import { MotmVotingSection } from '../components/results/MotmVotingSection';
import { TeamRoster } from '../components/results/TeamRoster';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { VideoPlayer } from '../components/results/VideoPlayer';

const GameDetail: React.FC = () => {
  const { sequenceNumber } = useParams<{ sequenceNumber: string }>();
  const location = useLocation();
  const { user } = useAuth();

  // Read ?highlight= query param for deep linking
  const focusHighlightId = new URLSearchParams(location.search).get('highlight');
  const hasTriggeredGeneration = useRef(false);
  const [seekToSeconds, setSeekToSeconds] = useState<number | undefined>(undefined);
  const [seekKey, setSeekKey] = useState(0);
  const videoRef = useRef<HTMLDivElement>(null);
  const getVideoTimeRef = useRef<(() => number | null) | null>(null);

  const handlePlayerReady = useCallback((getCurrentTime: () => number | null) => {
    getVideoTimeRef.current = getCurrentTime;
  }, []);

  const {
    game,
    loading: gameLoading,
    error: gameError,
    blueTeam,
    orangeTeam,
    reserves,
  } = useGameDetail(sequenceNumber);

  const {
    insights,
    whatsappSummary,
    loading: insightsLoading,
    generating,
    generateOnDemand,
  } = usePostMatchAnalysis(game?.id || null);

  // Auto-generate insights for completed games that don't have any
  useEffect(() => {
    const shouldGenerate =
      game &&
      game.status === 'completed' &&
      !insightsLoading &&
      !generating &&
      insights.length === 0 &&
      !hasTriggeredGeneration.current;

    if (shouldGenerate) {
      hasTriggeredGeneration.current = true;
      generateOnDemand();
    }
  }, [game, insights.length, insightsLoading, generating, generateOnDemand]);

  // Reset generation flag when game changes
  useEffect(() => {
    hasTriggeredGeneration.current = false;
  }, [sequenceNumber]);

  // Loading state
  if (gameLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Error state
  if (gameError || !game) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/results"
          className="btn btn-ghost btn-sm gap-2 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Results
        </Link>

        <div className="alert alert-error">
          <span>{gameError || 'Game not found'}</span>
        </div>
      </div>
    );
  }

  const totalPlayers = blueTeam.length + orangeTeam.length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Link
          to="/results"
          className="btn btn-ghost btn-sm gap-2 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Results
        </Link>
      </motion.div>

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="w-6 h-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">
            WNF #{game.sequence_number}
          </h1>
        </div>
      </motion.div>

      {/* Score Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <ScoreHero
          scoreBlue={game.score_blue}
          scoreOrange={game.score_orange}
          outcome={game.outcome}
        />
      </motion.div>

      {/* Video Player - below ScoreHero */}
      {game.youtube_url && (
        <motion.div
          ref={videoRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <VideoPlayer
            youtubeUrl={game.youtube_url}
            title={`WNF #${game.sequence_number} - Match Video`}
            seekToSeconds={seekToSeconds}
            seekKey={seekKey}
            onPlayerReady={handlePlayerReady}
          />
        </motion.div>
      )}

      {/* Match Highlights - below video */}
      {game.youtube_url && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <HighlightsSection
            gameId={game.id}
            youtubeUrl={game.youtube_url}
            registrations={game.game_registrations}
            scoreBlue={game.score_blue}
            scoreOrange={game.score_orange}
            onSeekTo={(s) => {
              setSeekToSeconds(Math.max(0, s - 3));
              setSeekKey(k => k + 1);
              videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            getVideoCurrentTime={() => getVideoTimeRef.current?.() ?? null}
            focusHighlightId={focusHighlightId}
            sequenceNumber={game.sequence_number}
            gameDate={game.date}
          />
        </motion.div>
      )}

      {/* Game Metadata Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="stats stats-vertical md:stats-horizontal shadow w-full mb-6 bg-base-200"
      >
        <div className="stat">
          <div className="stat-figure text-primary">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="stat-title">Date</div>
          <div className="stat-value text-lg">{formatDate(game.date)}</div>
        </div>

        {game.venue?.name && (
          <div className="stat">
            <div className="stat-figure text-primary">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="stat-title">Venue</div>
            <div className="stat-value text-lg">{game.venue.name}</div>
            {game.venue.google_maps_url && (
              <div className="stat-desc">
                <a
                  href={game.venue.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary"
                >
                  View on Maps
                </a>
              </div>
            )}
          </div>
        )}

        <div className="stat">
          <div className="stat-figure text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div className="stat-title">Players</div>
          <div className="stat-value text-lg">{totalPlayers}</div>
          {reserves.length > 0 && (
            <div className="stat-desc">+ {reserves.length} reserves</div>
          )}
        </div>

        {insights.length > 0 && (
          <div className="stat">
            <div className="stat-figure text-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="stat-title">Insights</div>
            <div className="stat-value text-lg">{insights.length}</div>
          </div>
        )}
      </motion.div>

      {/* Team Rosters - Right after stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <TeamRoster
          blueTeam={blueTeam}
          orangeTeam={orangeTeam}
          reserves={reserves}
        />
      </motion.div>

      {/* Man of the Match Voting - for all completed games */}
      {game.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="mb-8"
        >
          <MotmVotingSection
            gameId={game.id}
            gameDate={game.date}
            registrations={game.game_registrations}
          />
        </motion.div>
      )}

      {/* Login Prompt - Shows benefits for both Match Summary and Post-Match Report */}
      {!user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-6"
        >
          <div className="alert bg-base-200">
            <LogIn className="w-5 h-5 text-primary" />
            <span>
              <Link
                to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
                className="link link-primary font-medium"
              >
                Log in
              </Link>{' '}
              to add match highlights, filter insights about you, and more
            </span>
          </div>
        </motion.div>
      )}

      {/* Match Summary */}
      {whatsappSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <MatchSummary summary={whatsappSummary} />
        </motion.div>
      )}

      {/* Generating Insights Indicator */}
      {generating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="alert alert-info">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span>Generating post-match insights for this game...</span>
            <span className="loading loading-dots loading-sm" />
          </div>
        </motion.div>
      )}

      {/* Post-Match Insights (Full Report) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <InsightsSection insights={insights} loading={insightsLoading || generating} />
      </motion.div>
    </div>
  );
};

export default GameDetail;
