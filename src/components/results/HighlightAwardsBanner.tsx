/**
 * HighlightAwardsBanner - Compact banner showing award winners at top of highlights
 * Displayed when there are clear winners for Best Goal / Play of the Match
 * Mobile-optimised: stacked layout on small screens, readable text sizing
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
    <div className="flex flex-col sm:flex-row gap-2">
      {bestGoalWinner && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex-1 min-w-0">
          <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-600">Best Goal</p>
            <p className="text-sm text-base-content/70 truncate">
              {getHighlightScorer(bestGoalWinner.highlightId) || getHighlightDescription(bestGoalWinner.highlightId)}
            </p>
          </div>
          <span className="text-xs text-base-content/40 flex-shrink-0">
            {bestGoalWinner.voteCount} vote{bestGoalWinner.voteCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {playOfMatchWinner && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex-1 min-w-0">
          <Star className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-600">Play of the Match</p>
            <p className="text-sm text-base-content/70 truncate">
              {getHighlightDescription(playOfMatchWinner.highlightId)}
            </p>
          </div>
          <span className="text-xs text-base-content/40 flex-shrink-0">
            {playOfMatchWinner.voteCount} vote{playOfMatchWinner.voteCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};

export default HighlightAwardsBanner;
