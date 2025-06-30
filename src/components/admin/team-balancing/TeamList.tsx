import { motion } from 'framer-motion';
import { TeamAssignment } from './types';
import { formatRating } from '../../../utils/ratingFormatters';

// Made win_rate required to match the data we have

interface TeamListProps {
  teamId: 'blue' | 'orange';
  team: TeamAssignment[];
  title?: string;
  selectedPlayer: string | null;
  previewState?: {
    player1: string | null;
    player2: string | null;
    active: boolean;
  };
  swapRankings: { [playerId: string]: number } | null;
  onPlayerSelect: (playerId: string) => void;
  onPlayerHover?: (playerId: string | null) => void;
  onPreviewRequest?: (playerId: string) => void;
  onCancelPreview?: () => void;
  onExecutePreviewSwap?: () => void;
}

interface PlayerCardProps {
  player: TeamAssignment;
  isSelected: boolean;
  isTempSelected: boolean;
  swapRank: number | null;
  onSelect: () => void;
  onHover: () => void;
  onLeave: () => void;
  onPreviewRequest?: () => void;
  onCancelPreview?: () => void;
  onExecutePreviewSwap?: () => void;
  showSwapButton: boolean;
}

const PlayerCard = ({ 
  player, 
  isSelected,
  isTempSelected,
  swapRank,
  onSelect,
  onHover,
  onLeave,
  onPreviewRequest,
  onCancelPreview,
  onExecutePreviewSwap,
  showSwapButton
}: PlayerCardProps) => {
  // Get background style based on swap rank
  const getBackgroundStyle = () => {
    if (isSelected) return 'bg-primary-content';
    if (isTempSelected) return 'bg-primary-content';
    if (swapRank !== null) {
      const intensity = 100 - Math.min(swapRank * 10, 95);
      return `bg-success-${intensity < 10 ? '100' : Math.round(intensity / 10) * 10}`;
    }
    return 'bg-base-100';
  };

  return (
    <motion.div 
      key={player.player_id}
      className={`card w-full shadow-lg ${
        isSelected ? 'border-2 border-primary' : 
        isTempSelected ? 'border-2 border-purple-500' : 
        'border border-base-300'
      } ${getBackgroundStyle()}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onTouchStart={onHover}
    >
      <div className="card-body p-4">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{player.friendly_name}</h3>
            
            {/* Stats grid layout */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
              {/* Ratings */}
              <div className="flex items-center">
                <span className="text-xs font-medium w-16">Attack:</span>
                <span className="text-sm font-semibold">{formatRating(player.attack_rating)}</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs font-medium w-16">Defense:</span>
                <span className="text-sm font-semibold">{formatRating(player.defense_rating)}</span>
              </div>
              
              {/* Game IQ */}
              <div className="flex items-center">
                <span className="text-xs font-medium w-16">Game IQ:</span>
                <span className="text-sm font-semibold">{formatRating(player.game_iq_rating)}</span>
              </div>
              
              {/* Win Rate */}
              <div className="flex items-center">
                <span className="text-xs font-medium w-16">Win Rate:</span>
                <span className="text-sm">
                  {player.win_rate !== null && 
                   player.win_rate !== undefined && 
                   typeof player.win_rate === 'number'
                    ? <span className={player.win_rate > 60 ? 'text-success' : player.win_rate < 40 ? 'text-error' : ''}>
                        {`${player.win_rate.toFixed(0)}%`}
                      </span>
                    : <span className="text-xs opacity-70">N/A</span>
                  }
                </span>
              </div>
              
              {/* Goal Differential */}
              <div className="flex items-center">
                <span className="text-xs font-medium w-16">Goal Diff:</span>
                <span className="text-sm">
                  {player.goal_differential !== null && 
                   player.goal_differential !== undefined && 
                   typeof player.goal_differential === 'number' &&
                   player.goal_differential !== 0
                    ? <span className={Math.round(player.goal_differential) > 0 ? 'text-success' : Math.round(player.goal_differential) < 0 ? 'text-error' : ''}>
                        {`${player.goal_differential > 0 ? '+' : ''}${Math.round(player.goal_differential)}`}
                      </span>
                    : <span className="text-xs opacity-70">0</span>
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center mt-2">
          {/* Show swap ranking if available */}
          {swapRank !== null && (
            <span className={`text-xs ${swapRank > 0 ? 'text-success' : 'text-error'}`}>
              Swap Rating: {swapRank.toFixed(1)}
            </span>
          )}
          
          {/* Buttons for selection and preview */}
          <div className="flex gap-2 mt-2 sm:mt-0">
            {isSelected ? (
              <button 
                className="btn btn-xs btn-outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
              >
                Cancel
              </button>
            ) : isTempSelected ? (
              <div className="flex gap-2">
                <button 
                  className="btn btn-xs btn-error btn-outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCancelPreview) {
                      onCancelPreview();
                    }
                  }}
                >
                  Cancel
                </button>
                {showSwapButton && (
                  <button 
                    className="btn btn-xs btn-success"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onExecutePreviewSwap) {
                        onExecutePreviewSwap();
                      }
                    }}
                  >
                    Swap
                  </button>
                )}
              </div>
            ) : (
              <>
                <button 
                  className="btn btn-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                  }}
                >
                  Select
                </button>
                <button 
                  className={`btn btn-xs ${isTempSelected ? 'btn-purple bg-purple-500 text-white' : 'btn-outline'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onPreviewRequest) {
                      onPreviewRequest();
                    } else {
                      onHover();
                    }
                  }}
                >
                  {isTempSelected ? 'Previewing...' : 'Preview'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const TeamList = ({ team, title, selectedPlayer, previewState, swapRankings, onPlayerSelect, onPlayerHover, onPreviewRequest, onCancelPreview, onExecutePreviewSwap }: TeamListProps) => {
  // Sort players by rating for display (including Game IQ)
  const sortedPlayers = [...team].sort((a, b) => {
    const aTotal = (a.attack_rating ?? 0) + (a.defense_rating ?? 0) + (a.game_iq_rating ?? 0);
    const bTotal = (b.attack_rating ?? 0) + (b.defense_rating ?? 0) + (b.game_iq_rating ?? 0);
    return bTotal - aTotal;
  });

  return (
    <div className="bg-base-200 p-4 rounded-lg">
      <h2 className={`text-lg font-bold mb-4`}>
        {title} ({team.length})
      </h2>
      
      <div className="space-y-3">
        {sortedPlayers.map(player => (
          <PlayerCard
            key={player.player_id}
            player={player}
            isSelected={player.player_id === selectedPlayer}
            isTempSelected={previewState ? (previewState.player1 === player.player_id || previewState.player2 === player.player_id) : false}
            swapRank={swapRankings && swapRankings[player.player_id] || null}
            onSelect={() => onPlayerSelect(player.player_id)}
            onHover={() => onPlayerHover && onPlayerHover(player.player_id)}
            onLeave={() => onPlayerHover && onPlayerHover(null)}
            onPreviewRequest={() => onPreviewRequest && onPreviewRequest(player.player_id)}
            onCancelPreview={() => onCancelPreview && onCancelPreview()}
            onExecutePreviewSwap={() => onExecutePreviewSwap && onExecutePreviewSwap()}
            showSwapButton={!!(previewState && previewState.player1 && previewState.player2 && previewState.active)}
          />
        ))}
      </div>
    </div>
  );
};
