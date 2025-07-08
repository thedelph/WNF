import React from 'react';
import { Tooltip } from '../../ui/Tooltip';
import { PlayerSwapSuggestion } from './types';

interface SwapSuggestionProps {
  swap: PlayerSwapSuggestion;
  selected: boolean;
  onSelect: (swap: PlayerSwapSuggestion) => void;
}

/**
 * SwapSuggestion component displays a single player swap suggestion card
 * Shows the players being swapped and the expected improvement in team balance 
 * @param swap - The swap suggestion data
 * @param selected - Whether this swap is currently selected
 * @param onSelect - Callback when this swap is selected
 */
export const SwapSuggestion: React.FC<SwapSuggestionProps> = ({ swap, selected, onSelect }) => {
  // Format a numeric stat with 1 decimal place
  const formatStat = (value: number) => value.toFixed(1);

  return (
    <div 
      className={`p-3 rounded-lg border border-base-300 cursor-pointer transition-colors mb-2 
        ${selected ? 'bg-primary bg-opacity-10 border-primary' : 'hover:bg-base-200'}`}
      onClick={() => onSelect(swap)}
    >
      <div className="flex flex-col">
        <div className="flex justify-between mb-2">
          <div>
            <span className="text-blue-500 font-semibold">{swap.bluePlayer.friendly_name}</span>
            <span className="mx-2">↔</span>
            <span className="text-orange-500 font-semibold">{swap.orangePlayer.friendly_name}</span>
          </div>
          
          <div className="badge badge-success">
            +{formatStat(swap.totalDiffImprovement)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <Tooltip content="How much this swap improves attack balance">
              <span className={swap.primaryImpactMetric === 'attack' ? 'font-bold text-blue-600' : ''}>
                Attack: {formatStat(swap.attackDiffImprovement)}
                {swap.primaryImpactMetric === 'attack' && 
                  <span className="ml-1 text-blue-600">★</span>
                }
              </span>
            </Tooltip>
          </div>
          <div>
            <Tooltip content="How much this swap improves defense balance">
              <span className={swap.primaryImpactMetric === 'defense' ? 'font-bold text-green-600' : ''}>
                Defense: {formatStat(swap.defenseDiffImprovement)}
                {swap.primaryImpactMetric === 'defense' && 
                  <span className="ml-1 text-green-600">★</span>
                }
              </span>
            </Tooltip>
          </div>
          <div>
            <Tooltip content="How much this swap improves Game IQ balance">
              <span className={swap.primaryImpactMetric === 'gameIq' ? 'font-bold text-purple-600' : ''}>
                Game IQ: {formatStat(swap.gameIqDiffImprovement)}
                {swap.primaryImpactMetric === 'gameIq' && 
                  <span className="ml-1 text-purple-600">★</span>
                }
              </span>
            </Tooltip>
          </div>
          
          {swap.winRateDiffImprovement !== undefined && (
            <div>
              <Tooltip content="How much this swap improves win rate balance">
                <span className={swap.primaryImpactMetric === 'winRate' ? 'font-bold text-yellow-600' : ''}>
                  Win Rate: {formatStat(swap.winRateDiffImprovement)}
                  {swap.primaryImpactMetric === 'winRate' && 
                    <span className="ml-1 text-yellow-600">★</span>
                  }
                </span>
              </Tooltip>
            </div>
          )}
          
          {swap.goalDiffImprovement !== undefined && (
            <div>
              <Tooltip content="How much this swap improves goal differential balance">
                <span className={swap.primaryImpactMetric === 'goalDifferential' ? 'font-bold text-red-600' : ''}>
                  Goal Diff: {formatStat(swap.goalDiffImprovement)}
                  {swap.primaryImpactMetric === 'goalDifferential' && 
                    <span className="ml-1 text-red-600">★</span>
                  }
                </span>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
