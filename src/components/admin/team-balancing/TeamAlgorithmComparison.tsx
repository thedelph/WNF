import React from 'react';
import { TeamAssignment } from './types';
import { TierBasedResult } from './tierBasedSnakeDraft';
import { formatRating } from '../../../utils/ratingFormatters';

interface TeamAlgorithmComparisonProps {
  currentResult: {
    blueTeam: TeamAssignment[];
    orangeTeam: TeamAssignment[];
    score: number;
  } | null;
  tierBasedResult: TierBasedResult | null;
}

/**
 * Component to compare results from both team balancing algorithms
 */
export const TeamAlgorithmComparison: React.FC<TeamAlgorithmComparisonProps> = ({
  currentResult,
  tierBasedResult
}) => {
  if (!currentResult || !tierBasedResult) {
    return null;
  }

  // Calculate team statistics for comparison
  const calculateTeamStats = (team: TeamAssignment[]) => {
    const count = team.length;
    if (count === 0) return { attack: 0, defense: 0, gameIq: 0 };
    
    return {
      attack: team.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / count,
      defense: team.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / count,
      gameIq: team.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / count
    };
  };

  const currentBlueStats = calculateTeamStats(currentResult.blueTeam);
  const currentOrangeStats = calculateTeamStats(currentResult.orangeTeam);
  const tierBlueStats = calculateTeamStats(tierBasedResult.blueTeam);
  const tierOrangeStats = calculateTeamStats(tierBasedResult.orangeTeam);

  // Calculate differences for each metric
  const currentDiffs = {
    attack: Math.abs(currentBlueStats.attack - currentOrangeStats.attack),
    defense: Math.abs(currentBlueStats.defense - currentOrangeStats.defense),
    gameIq: Math.abs(currentBlueStats.gameIq - currentOrangeStats.gameIq)
  };

  const tierDiffs = {
    attack: Math.abs(tierBlueStats.attack - tierOrangeStats.attack),
    defense: Math.abs(tierBlueStats.defense - tierOrangeStats.defense),
    gameIq: Math.abs(tierBlueStats.gameIq - tierOrangeStats.gameIq)
  };

  // Find player movements between algorithms
  const playerMovements = currentResult.blueTeam.concat(currentResult.orangeTeam).map(player => {
    const currentTeam = currentResult.blueTeam.some(p => p.player_id === player.player_id) ? 'blue' : 'orange';
    const tierTeam = tierBasedResult.blueTeam.some(p => p.player_id === player.player_id) ? 'blue' : 'orange';
    
    return {
      playerId: player.player_id,
      playerName: player.friendly_name,
      currentTeam,
      tierTeam,
      moved: currentTeam !== tierTeam
    };
  });

  const movedPlayers = playerMovements.filter(p => p.moved);

  return (
    <div className="mb-6 bg-base-100 p-4 rounded-lg border">
      <h3 className="text-lg font-bold mb-4">Algorithm Comparison</h3>
      
      {/* Score comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-base-200 p-3 rounded">
          <h4 className="font-medium mb-2">Current Algorithm</h4>
          <div className="text-sm">
            <div>Overall Score: <span className="font-bold">{currentResult.score.toFixed(3)}</span></div>
            <div>Attack Diff: {currentDiffs.attack.toFixed(2)}</div>
            <div>Defense Diff: {currentDiffs.defense.toFixed(2)}</div>
            <div>Game IQ Diff: {currentDiffs.gameIq.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="bg-base-200 p-3 rounded">
          <h4 className="font-medium mb-2">Tier-Based Algorithm</h4>
          <div className="text-sm">
            <div>Overall Score: <span className="font-bold">{tierBasedResult.optimizedScore.toFixed(3)}</span></div>
            <div>Attack Diff: {tierDiffs.attack.toFixed(2)}</div>
            <div>Defense Diff: {tierDiffs.defense.toFixed(2)}</div>
            <div>Game IQ Diff: {tierDiffs.gameIq.toFixed(2)}</div>
            {tierBasedResult.wasOptimized && (
              <div className="text-xs text-success mt-1">
                ✓ Optimized from {tierBasedResult.initialScore.toFixed(3)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metric comparison bars */}
      <div className="mb-6">
        <h4 className="font-medium mb-2">Balance Comparison</h4>
        <div className="space-y-2">
          {(['attack', 'defense', 'gameIq'] as const).map(metric => {
            const currentDiff = currentDiffs[metric];
            const tierDiff = tierDiffs[metric];
            const maxDiff = Math.max(currentDiff, tierDiff);
            const improvement = ((currentDiff - tierDiff) / currentDiff * 100);
            
            return (
              <div key={metric} className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="capitalize">{metric === 'gameIq' ? 'Game IQ' : metric}</span>
                  <span className={tierDiff < currentDiff ? 'text-success' : tierDiff > currentDiff ? 'text-error' : ''}>
                    {improvement > 0 ? '+' : ''}{improvement.toFixed(0)}%
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-2 relative">
                      <div 
                        className="bg-primary h-2 rounded-full"
                        style={{ width: maxDiff > 0 ? `${(currentDiff / maxDiff) * 100}%` : '0%' }}
                      />
                    </div>
                    <div className="text-xs mt-0.5">Current: {currentDiff.toFixed(2)}</div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-2 relative">
                      <div 
                        className="bg-secondary h-2 rounded-full"
                        style={{ width: maxDiff > 0 ? `${(tierDiff / maxDiff) * 100}%` : '0%' }}
                      />
                    </div>
                    <div className="text-xs mt-0.5">Tier-Based: {tierDiff.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player movements */}
      <div>
        <h4 className="font-medium mb-2">
          Player Movements ({movedPlayers.length} players switch teams)
        </h4>
        {movedPlayers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {movedPlayers.map(player => (
              <div key={player.playerId} className="flex items-center gap-2 bg-base-200 p-2 rounded">
                <span className="flex-1 truncate">{player.playerName}</span>
                <span className={`badge badge-sm ${player.currentTeam === 'blue' ? 'badge-primary' : 'badge-warning'}`}>
                  {player.currentTeam}
                </span>
                <span>→</span>
                <span className={`badge badge-sm ${player.tierTeam === 'blue' ? 'badge-primary' : 'badge-warning'}`}>
                  {player.tierTeam}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Both algorithms produced the same team assignments</p>
        )}
      </div>

      {/* Winner indicator */}
      <div className="mt-4 p-3 bg-base-200 rounded">
        <div className="text-center">
          {currentResult.score < tierBasedResult.optimizedScore ? (
            <div>
              <span className="text-lg font-bold text-primary">Current Algorithm</span>
              <span className="text-sm ml-2">produces better balance</span>
            </div>
          ) : currentResult.score > tierBasedResult.optimizedScore ? (
            <div>
              <span className="text-lg font-bold text-secondary">Tier-Based Algorithm</span>
              <span className="text-sm ml-2">produces better balance</span>
            </div>
          ) : (
            <div>
              <span className="text-lg font-bold">Both algorithms</span>
              <span className="text-sm ml-2">produce equal balance</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};