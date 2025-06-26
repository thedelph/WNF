import React from 'react';
import { PlayerSwapSuggestion } from './types';
import { SwapSuggestion } from './SwapSuggestion';
import { formatRating } from '../../../utils/ratingFormatters';

interface SwapRecommendationsProps {
  swaps: PlayerSwapSuggestion[];
  selectedSwap: PlayerSwapSuggestion | null;
  onSwapSelect: (swap: PlayerSwapSuggestion) => void;
  onSwapApply: (swap: PlayerSwapSuggestion) => void;
  swapStats: any; // Stats for the selected swap
  teamStats: any; // Current team stats
}

/**
 * SwapRecommendations component displays a list of recommended player swaps
 * Shows potential swaps sorted by improvement with detailed metrics
 * @param swaps - List of swap recommendations
 * @param selectedSwap - Currently selected swap
 * @param onSwapSelect - Callback when a swap is selected
 * @param onSwapApply - Callback when a swap is applied
 * @param swapStats - Stats for the selected swap
 * @param teamStats - Current team stats
 */
export const SwapRecommendations: React.FC<SwapRecommendationsProps> = ({
  swaps,
  selectedSwap,
  onSwapSelect,
  onSwapApply,
  swapStats,
  teamStats
}) => {
  
  // Don't render if there are no swaps
  if (!swaps || swaps.length === 0) {
    return null;
  }

  // Determine if these are player-specific swaps or automatic recommendations
  const isPlayerSpecific = swaps.length > 0 && 
    swaps.every(swap => 
      swap.bluePlayer.player_id === swaps[0].bluePlayer.player_id || 
      swap.orangePlayer.player_id === swaps[0].orangePlayer.player_id
    );

  return (
    <div className="mb-6 bg-base-100 p-4 rounded-lg border">
      {isPlayerSpecific ? (
        <>
          <h3 className="text-lg font-bold mb-2">Player Swap Options</h3>
          <p className="text-sm mb-4">These swaps would improve team balance for the selected player.</p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-bold mb-2">Top Recommended Swaps</h3>
          <p className="text-sm mb-4">These are the most effective swaps to improve overall team balance.</p>
        </>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {swaps.slice(0, 6).map((swap) => (
          <SwapSuggestion
            key={`${swap.bluePlayer.player_id}-${swap.orangePlayer.player_id}`}
            swap={swap}
            selected={selectedSwap === swap}
            onSelect={onSwapSelect}
          />
        ))}
      </div>
      
      {selectedSwap && swapStats && (
        <div className="mt-4 p-4 bg-base-200 rounded-lg">
          <h4 className="font-bold">Swap Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <h5 className="font-medium">Player Comparison</h5>
              <table className="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Attack</th>
                    <th>Defense</th>
                    <th>Game IQ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-blue-500">{selectedSwap.bluePlayer.friendly_name}</td>
                    <td>{formatRating(selectedSwap.bluePlayer.attack_rating)}</td>
                    <td>{formatRating(selectedSwap.bluePlayer.defense_rating)}</td>
                    <td>{formatRating(selectedSwap.bluePlayer.game_iq_rating)}</td>
                  </tr>
                  <tr>
                    <td className="text-orange-500">{selectedSwap.orangePlayer.friendly_name}</td>
                    <td>{formatRating(selectedSwap.orangePlayer.attack_rating)}</td>
                    <td>{formatRating(selectedSwap.orangePlayer.defense_rating)}</td>
                    <td>{formatRating(selectedSwap.orangePlayer.game_iq_rating)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div>
              <h5 className="font-medium">Balance Improvements</h5>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p>Attack: {teamStats.attackDiff.toFixed(1)} → {swapStats.attackDiff.toFixed(1)}</p>
                  <p className={`${swapStats.attackDiff < teamStats.attackDiff ? 'text-success' : 'text-error'}`}>
                    {swapStats.attackDiff < teamStats.attackDiff ? '✓ Better' : '✗ Worse'}
                  </p>
                </div>
                <div>
                  <p>Defense: {teamStats.defenseDiff.toFixed(1)} → {swapStats.defenseDiff.toFixed(1)}</p>
                  <p className={`${swapStats.defenseDiff < teamStats.defenseDiff ? 'text-success' : 'text-error'}`}>
                    {swapStats.defenseDiff < teamStats.defenseDiff ? '✓ Better' : '✗ Worse'}
                  </p>
                </div>
                <div>
                  <p>Game IQ: {teamStats.gameIqDiff.toFixed(1)} → {swapStats.gameIqDiff.toFixed(1)}</p>
                  <p className={`${swapStats.gameIqDiff < teamStats.gameIqDiff ? 'text-success' : 'text-error'}`}>
                    {swapStats.gameIqDiff < teamStats.gameIqDiff ? '✓ Better' : '✗ Worse'}
                  </p>
                </div>
                <div>
                  <p>Win Rate: {teamStats.winRateDiff.toFixed(1)} → {swapStats.winRateDiff.toFixed(1)}</p>
                  <p className={`${swapStats.winRateDiff < teamStats.winRateDiff ? 'text-success' : 'text-error'}`}>
                    {swapStats.winRateDiff < teamStats.winRateDiff ? '✓ Better' : '✗ Worse'}
                  </p>
                </div>
                {(teamStats.goalDifferentialDiff !== undefined && swapStats.goalDifferentialDiff !== undefined) && (
                  <div>
                    <p>Goal Diff: {teamStats.goalDifferentialDiff.toFixed(1)} → {swapStats.goalDifferentialDiff.toFixed(1)}</p>
                    <p className={`${swapStats.goalDifferentialDiff < teamStats.goalDifferentialDiff ? 'text-success' : 'text-error'}`}>
                      {swapStats.goalDifferentialDiff < teamStats.goalDifferentialDiff ? '✓ Better' : '✗ Worse'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onSwapApply(selectedSwap)}
            >
              Apply Swap
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
