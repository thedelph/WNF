/**
 * HighlightAwardsBanner - Compact banner showing award winners at top of highlights
 * Displayed when there are clear winners for Best Goal / Play of the Match
 */

import React from 'react';
import { Trophy, Star } from 'lucide-react';
import { HighlightAwardWinner } from '../../types/highlights';
import { GameHighlight } from '../../types/highlights';

interface HighlightAwardsBannerProps {
  bestGoalWinner: HighlightAwardWinner | null;
  playOfMatchWinner: HighlightAwardWinner | null;
  highlights: GameHighlight[];
}

export const HighlightAwardsBanner: React.FC<HighlightAwardsBannerProps> = ({
  bestGoalWinner,
  playOfMatchWinner,
  highlights,
}) => {
  if (!bestGoalWinner && !playOfMatchWinner) return null;

  const getHighlightDescription = (highlightId: string) => {
    const hl = highlights.find(h => h.id === highlightId);
    if (!hl) return 'Unknown highlight';
    const desc = hl.description.length > 40 ? hl.description.slice(0, 40) + '...' : hl.description;
    return desc;
  };

  const getHighlightScorer = (highlightId: string) => {
    const hl = highlights.find(h => h.id === highlightId);
    return hl?.scorer?.friendly_name || hl?.player?.friendly_name;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {bestGoalWinner && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-medium text-amber-600">Best Goal</span>
            <span className="text-xs text-base-content/60 ml-1.5">
              {getHighlightScorer(bestGoalWinner.highlightId) || getHighlightDescription(bestGoalWinner.highlightId)}
            </span>
            <span className="text-xs text-base-content/40 ml-1">
              ({bestGoalWinner.voteCount} vote{bestGoalWinner.voteCount !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      )}

      {playOfMatchWinner && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-medium text-amber-600">Play of the Match</span>
            <span className="text-xs text-base-content/60 ml-1.5">
              {getHighlightDescription(playOfMatchWinner.highlightId)}
            </span>
            <span className="text-xs text-base-content/40 ml-1">
              ({playOfMatchWinner.voteCount} vote{playOfMatchWinner.voteCount !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightAwardsBanner;
