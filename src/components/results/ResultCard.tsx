/**
 * ResultCard - Displays a single game result in the results list
 * Shows WNF #, date, score, outcome, and user participation indicator
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDate } from '../../utils/dateUtils';
import { GameResultItem } from '../../hooks/useGameResults';

interface ResultCardProps {
  game: GameResultItem;
  index?: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({ game, index = 0 }) => {
  const hasScore = game.score_blue !== null && game.score_orange !== null;
  const isUserGame = game.user_status !== null;
  const wasReserve = game.user_status === 'reserve';

  // Determine if user won/lost/drew
  const userWon = isUserGame && !wasReserve && (
    (game.user_team === 'blue' && game.outcome === 'blue_win') ||
    (game.user_team === 'orange' && game.outcome === 'orange_win')
  );
  const userLost = isUserGame && !wasReserve && (
    (game.user_team === 'blue' && game.outcome === 'orange_win') ||
    (game.user_team === 'orange' && game.outcome === 'blue_win')
  );

  // Outcome badge
  const getOutcomeBadge = () => {
    if (!game.outcome) {
      return <span className="badge badge-ghost badge-sm">No Result</span>;
    }

    switch (game.outcome) {
      case 'blue_win':
        return <span className="badge badge-sm bg-blue-500/20 text-blue-500 border-blue-500/30">Blue Win</span>;
      case 'orange_win':
        return <span className="badge badge-sm bg-orange-500/20 text-orange-500 border-orange-500/30">Orange Win</span>;
      case 'draw':
        return <span className="badge badge-sm badge-neutral">Draw</span>;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <Link
        to={`/results/${game.sequence_number}`}
        className={`card bg-base-200 shadow hover:shadow-lg transition-all group ${
          isUserGame && !wasReserve
            ? 'ring-2 ring-primary/30 bg-primary/5'
            : wasReserve
            ? 'ring-2 ring-warning/30 bg-warning/5'
            : ''
        }`}
      >
        <div className="card-body p-4">
          {/* Header: WNF # and badges */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="card-title text-primary text-lg">
                WNF #{game.sequence_number}
              </h3>
              {isUserGame && (
                <span className={`badge badge-sm ${wasReserve ? 'badge-warning' : 'badge-primary'}`}>
                  {wasReserve ? 'Reserve' : 'You played'}
                </span>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-base-content/30 group-hover:text-primary transition-colors" />
          </div>

          {/* Date */}
          <p className="text-sm text-base-content/70 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary/50" />
            {formatDate(game.date)}
          </p>

          {/* Venue (if available) */}
          {game.venue?.name && (
            <p className="text-xs text-base-content/50">{game.venue.name}</p>
          )}

          {/* Score display */}
          <div className="mt-3">
            {hasScore ? (
              <div className="flex items-center justify-center gap-4 py-2 bg-base-100 rounded-lg">
                <div className={`text-center ${game.user_team === 'blue' && isUserGame ? 'font-bold' : ''}`}>
                  <div className="text-xs text-blue-500 font-medium">Blue</div>
                  <div className={`text-2xl font-bold ${
                    game.outcome === 'blue_win' ? 'text-blue-500' : 'text-base-content'
                  }`}>
                    {game.score_blue}
                  </div>
                </div>
                <div className="text-base-content/30 text-lg">-</div>
                <div className={`text-center ${game.user_team === 'orange' && isUserGame ? 'font-bold' : ''}`}>
                  <div className="text-xs text-orange-500 font-medium">Orange</div>
                  <div className={`text-2xl font-bold ${
                    game.outcome === 'orange_win' ? 'text-orange-500' : 'text-base-content'
                  }`}>
                    {game.score_orange}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center text-base-content/50 text-sm">
                Score not recorded
              </div>
            )}
          </div>

          {/* Outcome badge and user result */}
          <div className="flex items-center justify-between mt-2">
            {getOutcomeBadge()}
            {isUserGame && !wasReserve && game.outcome && (
              <span className={`badge badge-sm ${
                userWon ? 'badge-success' : userLost ? 'badge-error' : 'badge-neutral'
              }`}>
                {userWon ? 'Win' : userLost ? 'Loss' : 'Draw'}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ResultCard;
