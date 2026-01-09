import React, { useState, useEffect, useMemo } from 'react';
import { TeamAssignment } from './types';
import { findOptimalTeamBalance, isUnknownPlayer } from './teamBalanceUtils';
import { Tooltip } from '../../ui/Tooltip';
import { toast } from 'react-hot-toast';
import { calculateBalanceScore } from '../../../utils/teamBalancing';
import { formatRating } from '../../../utils/ratingFormatters';

interface OptimalTeamGeneratorProps {
  allPlayers: TeamAssignment[];
  onApplyTeams: (blueTeam: TeamAssignment[], orangeTeam: TeamAssignment[]) => void;
}

/**
 * OptimalTeamGenerator component
 * Provides functionality to automatically generate the most balanced teams possible
 * from the available players using an optimization algorithm
 * 
 * @param allPlayers - All available players
 * @param onApplyTeams - Callback when optimal teams are applied
 */
export const OptimalTeamGenerator: React.FC<OptimalTeamGeneratorProps> = ({
  allPlayers,
  onApplyTeams
}) => {
  // State to store the optimal team configuration
  const [optimalTeams, setOptimalTeams] = useState<{
    blueTeam: TeamAssignment[];
    orangeTeam: TeamAssignment[];
    score: number;
  } | null>(null);
  
  // State to track if current teams are already optimal
  const [isAlreadyOptimal, setIsAlreadyOptimal] = useState<boolean>(false);
  
  // Extract current teams from allPlayers
  const currentTeams = useMemo(() => {
    const blueTeam = allPlayers.filter(p => p.team === 'blue');
    const orangeTeam = allPlayers.filter(p => p.team === 'orange');
    
    // Only consider players assigned to teams
    if (blueTeam.length > 0 && orangeTeam.length > 0) {
      const currentScore = calculateBalanceScore(blueTeam, orangeTeam);
      return { blueTeam, orangeTeam, currentScore };
    }
    
    return null;
  }, [allPlayers]);

  // Check if current teams are optimal
  useEffect(() => {
    setIsAlreadyOptimal(false);
    setOptimalTeams(null);
  }, [allPlayers]);
  
  // Generate optimal teams based on all available metrics
  const generateOptimalTeams = () => {
    // Need at least 2 players to form teams
    if (allPlayers.length < 2) {
      toast.error('Need at least 2 players to generate teams');
      return;
    }

    try {
      // Show loading toast
      toast.loading('Calculating optimal teams...');
      
      // Find the optimal team balance
      const optimal = findOptimalTeamBalance(allPlayers);
      
      // Store the result
      setOptimalTeams(optimal);
      
      // Check if current teams are already optimal
      if (currentTeams && Math.abs(optimal.score - currentTeams.currentScore) < 0.01) {
        setIsAlreadyOptimal(true);
        toast.dismiss();
        toast.success('Teams are already optimally balanced!');
      } else {
        setIsAlreadyOptimal(false);
        toast.dismiss();
        toast.success('Found optimal team configuration!');
      }
    } catch (error) {
      // Dismiss loading toast and show error
      toast.dismiss();
      toast.error('Error generating optimal teams');
      console.error('Error generating optimal teams:', error);
    }
  };

  // Apply the optimal team configuration
  const applyOptimalTeams = () => {
    if (!optimalTeams) return;
    
    // Call the parent component's handler with the optimal teams
    onApplyTeams(
      optimalTeams.blueTeam.map(p => ({ ...p, team: 'blue' })),
      optimalTeams.orangeTeam.map(p => ({ ...p, team: 'orange' }))
    );
    
    // Reset the state
    setOptimalTeams(null);
    
    // Show success message
    toast.success('Applied optimal team configuration');
  };

  return (
    <div className="mb-6 bg-base-100 p-4 rounded-lg border">
      <h3 className="text-lg font-bold mb-2">Team Optimization</h3>
      <p className="text-sm mb-4">
        Automatically generate the most balanced teams possible from all available players.
      </p>
      
      <div className="flex gap-2 mb-4">
        <Tooltip content="Calculate the most balanced possible teams using all available metrics">
          <button 
            className="btn btn-primary btn-sm"
            onClick={generateOptimalTeams}
            disabled={allPlayers.length < 2}
          >
            Generate Optimal Teams
          </button>
        </Tooltip>
      </div>
      
      {isAlreadyOptimal && (
        <div className="alert alert-success mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Teams are already in the optimal configuration!</span>
        </div>
      )}
      
      {optimalTeams && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Optimal Team Configuration</h4>
            <span className="badge badge-success">Balance Score: {optimalTeams.score.toFixed(2)}</span>
          </div>
          
          {/* Confidence score based on unknown players */}
          {(() => {
            const unknownCount = [...optimalTeams.blueTeam, ...optimalTeams.orangeTeam].filter(isUnknownPlayer).length;
            const totalPlayers = optimalTeams.blueTeam.length + optimalTeams.orangeTeam.length;
            const unknownPercentage = (unknownCount / totalPlayers) * 100;
            
            let confidenceLevel = 'high';
            let confidenceColor = 'success';
            let confidenceMessage = 'High confidence in team balance';
            
            if (unknownPercentage > 50) {
              confidenceLevel = 'low';
              confidenceColor = 'error';
              confidenceMessage = 'Low confidence - many new players';
            } else if (unknownPercentage > 25) {
              confidenceLevel = 'medium';
              confidenceColor = 'warning';
              confidenceMessage = 'Medium confidence - some new players';
            }
            
            return (
              <div className={`alert alert-${confidenceColor} mb-4`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={confidenceLevel === 'high' ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : confidenceLevel === 'medium' ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                </svg>
                <div>
                  <span className="font-semibold">{confidenceMessage}</span>
                  <div className="text-sm">
                    {unknownCount} of {totalPlayers} players ({unknownPercentage.toFixed(0)}%) have less than 10 games played
                  </div>
                </div>
              </div>
            );
          })()}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Team summary stats */}
            <div className="col-span-2 grid grid-cols-2 gap-4 mb-2">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Blue Team Summary</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Avg Attack:</span> {(optimalTeams.blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / optimalTeams.blueTeam.length).toFixed(1)}
                  </div>
                  <div>
                    <span className="font-medium">Avg Defense:</span> {(optimalTeams.blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / optimalTeams.blueTeam.length).toFixed(1)}
                  </div>
                  <div>
                    <span className="font-medium">Avg Game IQ:</span> {(optimalTeams.blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / optimalTeams.blueTeam.length).toFixed(1)}
                  </div>
                  
                  {/* Win rate if available */}
                  {optimalTeams.blueTeam.some(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10) && (
                    <div>
                      <span className="font-medium">Avg Win Rate:</span> {
                        Math.round(
                          optimalTeams.blueTeam
                            .filter(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10)
                            .reduce((sum, p) => sum + (p.win_rate || 0), 0) / 
                          optimalTeams.blueTeam.filter(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10).length
                        )
                      }%
                    </div>
                  )}
                  
                  {/* Goal differential if available */}
                  {optimalTeams.blueTeam.some(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10) && (
                    <div>
                      <span className="font-medium">Avg Goal Diff:</span> {
                        Math.round(
                          optimalTeams.blueTeam
                            .filter(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10)
                            .reduce((sum, p) => sum + (p.goal_differential || 0), 0) / 
                          optimalTeams.blueTeam.filter(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10).length
                        )
                      }
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                <h5 className="font-medium text-orange-700 dark:text-orange-300 mb-2">Orange Team Summary</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Avg Attack:</span> {(optimalTeams.orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / optimalTeams.orangeTeam.length).toFixed(1)}
                  </div>
                  <div>
                    <span className="font-medium">Avg Defense:</span> {(optimalTeams.orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / optimalTeams.orangeTeam.length).toFixed(1)}
                  </div>
                  <div>
                    <span className="font-medium">Avg Game IQ:</span> {(optimalTeams.orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / optimalTeams.orangeTeam.length).toFixed(1)}
                  </div>
                  
                  {/* Win rate if available */}
                  {optimalTeams.orangeTeam.some(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10) && (
                    <div>
                      <span className="font-medium">Avg Win Rate:</span> {
                        Math.round(
                          optimalTeams.orangeTeam
                            .filter(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10)
                            .reduce((sum, p) => sum + (p.win_rate || 0), 0) / 
                          optimalTeams.orangeTeam.filter(p => p.win_rate !== null && p.win_rate !== undefined && (p.total_games || 0) >= 10).length
                        )
                      }%
                    </div>
                  )}
                  
                  {/* Goal differential if available */}
                  {optimalTeams.orangeTeam.some(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10) && (
                    <div>
                      <span className="font-medium">Avg Goal Diff:</span> {
                        Math.round(
                          optimalTeams.orangeTeam
                            .filter(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10)
                            .reduce((sum, p) => sum + (p.goal_differential || 0), 0) / 
                          optimalTeams.orangeTeam.filter(p => p.goal_differential !== null && p.goal_differential !== undefined && (p.total_games || 0) >= 10).length
                        )
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                Blue Team ({optimalTeams.blueTeam.length} players
                {(() => {
                  const newCount = optimalTeams.blueTeam.filter(isUnknownPlayer).length;
                  return newCount > 0 ? `, ${newCount} new` : '';
                })()})
              </h5>
              <ul className="list-disc pl-5">
                {optimalTeams.blueTeam.map(player => (
                  <li key={player.player_id} className="mb-1">
                    <span className="flex items-center gap-2">
                      {player.friendly_name}
                      {isUnknownPlayer(player) && (
                        <Tooltip content="New player - limited stats available">
                          <span className="badge badge-warning badge-xs">NEW</span>
                        </Tooltip>
                      )}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      <Tooltip content="Attack, Defense, and Game IQ ratings">
                        <span>A: {formatRating(player.attack_rating)}, D: {formatRating(player.defense_rating)}, IQ: {formatRating(player.game_iq_rating)}</span>
                      </Tooltip>
                      {player.win_rate !== null && player.win_rate !== undefined && (player.total_games || 0) >= 10 && (
                        <Tooltip content="Win rate from last 10 games">
                          <span className="ml-2">W: {Math.round(player.win_rate)}%</span>
                        </Tooltip>
                      )}
                      {player.goal_differential !== null && player.goal_differential !== undefined && (player.total_games || 0) >= 10 && (
                        <Tooltip content="Goal differential from last 10 games">
                          <span className="ml-2">GD: {player.goal_differential}</span>
                        </Tooltip>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <h5 className="font-medium text-orange-700 dark:text-orange-300 mb-2">
                Orange Team ({optimalTeams.orangeTeam.length} players
                {(() => {
                  const newCount = optimalTeams.orangeTeam.filter(isUnknownPlayer).length;
                  return newCount > 0 ? `, ${newCount} new` : '';
                })()})
              </h5>
              <ul className="list-disc pl-5">
                {optimalTeams.orangeTeam.map(player => (
                  <li key={player.player_id} className="mb-1">
                    <span className="flex items-center gap-2">
                      {player.friendly_name}
                      {isUnknownPlayer(player) && (
                        <Tooltip content="New player - limited stats available">
                          <span className="badge badge-warning badge-xs">NEW</span>
                        </Tooltip>
                      )}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      <Tooltip content="Attack, Defense, and Game IQ ratings">
                        <span>A: {formatRating(player.attack_rating)}, D: {formatRating(player.defense_rating)}, IQ: {formatRating(player.game_iq_rating)}</span>
                      </Tooltip>
                      {player.win_rate !== null && player.win_rate !== undefined && (player.total_games || 0) >= 10 && (
                        <Tooltip content="Win rate from last 10 games">
                          <span className="ml-2">W: {Math.round(player.win_rate)}%</span>
                        </Tooltip>
                      )}
                      {player.goal_differential !== null && player.goal_differential !== undefined && (player.total_games || 0) >= 10 && (
                        <Tooltip content="Goal differential from last 10 games">
                          <span className="ml-2">GD: {player.goal_differential}</span>
                        </Tooltip>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              className="btn btn-primary btn-sm"
              onClick={applyOptimalTeams}
            >
              Apply These Teams
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
