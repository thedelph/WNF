import { useCallback, useMemo, useState } from 'react';
import { TeamList } from '../team-balancing/TeamList';
import { TeamStats } from '../team-balancing/TeamStats';
import { toast } from 'react-hot-toast';
import { useTeamBalancing } from '../team-balancing/useTeamBalancing';
import { TeamAssignment, PlayerSwapSuggestion, TeamComparison } from '../team-balancing/types';
import { calculateBestSwaps, calculateMetricImpact } from '../team-balancing/teamBalanceUtils';
import { calculateTeamComparison } from '../team-balancing/teamBalanceCalcs';
import { WhatsAppExport } from '../team-balancing/WhatsAppExport';
import { SwapRecommendations } from '../team-balancing/SwapRecommendations';
import { PlayerSelectionAlert } from '../team-balancing/PlayerSelectionAlert';
import { PreviewSwapControls } from '../team-balancing/PreviewSwapControls';
import { BalancingActions } from '../team-balancing/BalancingActions';
import { OptimalTeamGenerator } from '../team-balancing/OptimalTeamGenerator';
import { Tooltip } from '../../ui/Tooltip';

/**
 * TeamBalancingOverview component
 * Main page for team balancing functionality
 * Uses modular components for better maintainability
 */
const TeamBalancingOverview = () => {
  // Get team balancing data and functions from the hook
  const { 
    isLoading, 
    error, 
    assignments,
    updateAssignments,
    saveTeamAssignments,
    hasUnsavedChanges,
    fetchData
  } = useTeamBalancing();

  // Player selection and swap state
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedSwap, setSelectedSwap] = useState<PlayerSwapSuggestion | null>(null);
  
  // Focus metric for swap recommendations
  const [focusMetric, setFocusMetric] = useState<'attack' | 'defense' | 'winRate' | 'goalDifferential' | null>(null);
  
  // Preview state for visualizing potential swaps
  const [previewState, setPreviewState] = useState<{
    player1: string | null;
    player2: string | null;
    active: boolean;
  }>({
    player1: null,
    player2: null,
    active: false
  });

  // Memoize filtered teams to prevent unnecessary recalculations
  const teams = useMemo(() => {
    if (!assignments) return { blueTeam: [], orangeTeam: [] };
    
    // Filter out null teams and only include players assigned to a specific team
    const blueTeam = assignments.filter(p => p.team === 'blue');
    const orangeTeam = assignments.filter(p => p.team === 'orange');
    
    return { blueTeam, orangeTeam };
  }, [assignments]);

  // Calculate team stats and comparison
  const teamStats = useMemo(() => {
    // Debug log for team assignments
    console.log('Team assignments for stats calculation:', assignments);
    if (!assignments || assignments.length === 0) {
      return {
        blue: { attack: 0, defense: 0, winRate: 0, goalDifferential: 0, playerCount: 0 },
        orange: { attack: 0, defense: 0, winRate: 0, goalDifferential: 0, playerCount: 0 },
        attackDiff: 0,
        defenseDiff: 0,
        winRateDiff: 0,
        goalDifferentialDiff: 0,
        currentScore: 0
      };
    }

    const { blueTeam, orangeTeam } = teams;
    const stats = calculateTeamComparison(blueTeam, orangeTeam);
    console.log('Calculated team stats:', stats);
    return stats;
  }, [assignments, teams]);

  // Calculate swap recommendations
  const swapSuggestions = useMemo(() => {
    if (!teams || !teams.blueTeam || !teams.orangeTeam) return [];
    
    // Calculate best swaps between teams, optionally focusing on a specific metric
    return calculateBestSwaps(
      teams.blueTeam, 
      teams.orangeTeam,
      focusMetric || undefined
    );
  }, [teams, focusMetric]);
  
  // Calculate metric impact for the current team configuration
  const metricImpact = useMemo(() => {
    if (!teams.blueTeam.length || !teams.orangeTeam.length) return null;
    return calculateMetricImpact(teams.blueTeam, teams.orangeTeam);
  }, [teams]);
  
  // Filter swap suggestions based on selected player or get top recommendations
  const relevantSwaps = useMemo(() => {
    if (selectedPlayer) {
      // If a player is selected, show swaps involving that player
      return swapSuggestions.filter(swap => 
        swap.bluePlayer.player_id === selectedPlayer || 
        swap.orangePlayer.player_id === selectedPlayer
      );
    } else {
      // If no player is selected, show the top 6 recommendations
      return swapSuggestions.slice(0, 6);
    }
  }, [swapSuggestions, selectedPlayer]);
  
  // Create a mapping of player IDs to swap rankings for the team lists
  const swapRankings = useMemo(() => {
    if (!selectedPlayer) return {};
    
    const rankings: { [playerId: string]: number } = {};
    
    relevantSwaps.forEach((swap) => {
      if (selectedPlayer === swap.bluePlayer.player_id) {
        rankings[swap.orangePlayer.player_id] = swap.totalDiffImprovement;
      } else if (selectedPlayer === swap.orangePlayer.player_id) {
        rankings[swap.bluePlayer.player_id] = swap.totalDiffImprovement;
      }
    });
    
    return rankings;
  }, [relevantSwaps, selectedPlayer]);

  // Handle player selection
  const handlePlayerSelect = useCallback((playerId: string) => {
    if (selectedPlayer === playerId) {
      // Deselect if already selected
      setSelectedPlayer(null);
    } else {
      // Select new player
      setSelectedPlayer(playerId);
    }
  }, [selectedPlayer]);
  
  // Handle player hover for visual feedback (currently not used)
  const handlePlayerHover = useCallback((playerId: string | null) => {
    // No-op for now - will be implemented for hover effects later
  }, []);

  // Handle previewing a potential swap
  const handlePreviewRequest = useCallback((playerId: string) => {
    // Find the player to swap with (either from blue or orange team)
    if (selectedPlayer) {
      const player1 = assignments.find(p => p.player_id === selectedPlayer);
      const player2 = assignments.find(p => p.player_id === playerId);
      
      if (player1 && player2 && player1.team !== player2.team) {
        // Set up the preview
        setPreviewState({
          player1: selectedPlayer,
          player2: playerId,
          active: true
        });
      } else {
        // Doesn't make sense to swap players on the same team
        toast.error('Cannot swap players on the same team');
      }
    }
  }, [selectedPlayer, assignments]);

  // Cancel the current preview
  const handleCancelPreview = useCallback(() => {
    setPreviewState({
      player1: null,
      player2: null,
      active: false
    });
  }, []);

  // Execute the currently previewed swap
  const handleExecutePreviewSwap = useCallback(() => {
    if (!previewState.active || !previewState.player1 || !previewState.player2) return;
    
    const player1 = assignments.find(p => p.player_id === previewState.player1);
    const player2 = assignments.find(p => p.player_id === previewState.player2);
    
    if (!player1 || !player2) return;
    
    // Swap the teams
    const player1Team = player1.team;
    const player2Team = player2.team;
    
    const updatedAssignments = assignments.map(player => {
      if (player.player_id === player1.player_id) {
        return { ...player, team: player2Team };
      } else if (player.player_id === player2.player_id) {
        return { ...player, team: player1Team };
      }
      return player;
    });
    
    // Update the assignments and reset preview state
    updateAssignments(updatedAssignments);
    setPreviewState({
      player1: null,
      player2: null,
      active: false
    });
    
    toast.success(`Swapped ${player1.friendly_name} and ${player2.friendly_name}`);
  }, [previewState, assignments, updateAssignments]);

  // Calculate stats for a swap
  const calculateSwapStats = useCallback((swapToCalculate: PlayerSwapSuggestion): TeamComparison | null => {
    const { bluePlayer, orangePlayer } = swapToCalculate;
    
    // Make a deep copy of the current teams
    const newBlueTeam = [...teams.blueTeam];
    const newOrangeTeam = [...teams.orangeTeam];
    
    // Find and remove the players from their current teams
    const bluePlayerIndex = newBlueTeam.findIndex(p => p.player_id === bluePlayer.player_id);
    const orangePlayerIndex = newOrangeTeam.findIndex(p => p.player_id === orangePlayer.player_id);
    
    if (bluePlayerIndex === -1 || orangePlayerIndex === -1) {
      return null;
    }
    
    const bluePlayerCopy = { ...newBlueTeam[bluePlayerIndex] };
    const orangePlayerCopy = { ...newOrangeTeam[orangePlayerIndex] };
    
    newBlueTeam.splice(bluePlayerIndex, 1);
    newOrangeTeam.splice(orangePlayerIndex, 1);
    
    // Add players to their new teams
    newBlueTeam.push({ ...orangePlayerCopy, team: 'blue' as const });
    newOrangeTeam.push({ ...bluePlayerCopy, team: 'orange' as const });
    
    // Calculate new stats
    const comparison = calculateTeamComparison(newBlueTeam, newOrangeTeam);
    const improvement = teamStats.currentScore - comparison.currentScore;
    
    return {
      ...comparison,
      totalDiff: comparison.currentScore,
      improvement
    };
  }, [teams, teamStats]);

  // Handle swap selection
  const handleSwapSelect = useCallback((swap: PlayerSwapSuggestion) => {
    setSelectedSwap(swap);
  }, []);

  // Execute a swap from the recommendations
  const handleSwapPlayers = useCallback((swap: PlayerSwapSuggestion) => {
    const { bluePlayer, orangePlayer } = swap;
    
    const updatedAssignments = assignments.map(player => {
      if (player.player_id === bluePlayer.player_id) {
        return { ...player, team: 'orange' as const };
      } else if (player.player_id === orangePlayer.player_id) {
        return { ...player, team: 'blue' as const };
      }
      return player;
    });
    
    updateAssignments(updatedAssignments);
    setSelectedSwap(null);
    toast.success(`Swapped ${bluePlayer.friendly_name} and ${orangePlayer.friendly_name}`);
  }, [assignments, updateAssignments]);

  // Calculate stats for selected swap
  const swapStats = useMemo(() => {
    if (!selectedSwap) return null;
    return calculateSwapStats(selectedSwap);
  }, [selectedSwap, calculateSwapStats]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Error state
  if (error || !assignments) {
    return (
      <div className="alert alert-error">
        <p>Error loading team data: {error || 'No assignments found'}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Team Balancing</h2>
          <p className="text-sm opacity-70">
            Balance teams by swapping players between teams. Click a player to select them for swapping.
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Metric focus buttons */}
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-sm btn-outline">
              {focusMetric ? `Focus: ${focusMetric}` : 'Focus Metric'} <span className="ml-1">▼</span>
            </label>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li>
                <a onClick={() => setFocusMetric(null)} className={focusMetric === null ? 'active' : ''}>
                  Balanced (Default)
                </a>
              </li>
              <li>
                <a onClick={() => setFocusMetric('attack')} className={focusMetric === 'attack' ? 'active' : ''}>
                  Focus on Attack
                </a>
              </li>
              <li>
                <a onClick={() => setFocusMetric('defense')} className={focusMetric === 'defense' ? 'active' : ''}>
                  Focus on Defense
                </a>
              </li>
              <li>
                <a onClick={() => setFocusMetric('winRate')} className={focusMetric === 'winRate' ? 'active' : ''}>
                  Focus on Win Rate
                </a>
              </li>
              <li>
                <a onClick={() => setFocusMetric('goalDifferential')} className={focusMetric === 'goalDifferential' ? 'active' : ''}>
                  Focus on Goal Differential
                </a>
              </li>
            </ul>
          </div>
          
          <WhatsAppExport 
            blueTeam={teams.blueTeam} 
            orangeTeam={teams.orangeTeam} 
          />
        </div>
      </div>

      {/* Team statistics section */}
      <div className="mb-8">
        <TeamStats 
          stats={teamStats} 
          previewSwapStats={previewState.active ? calculateSwapStats({
            bluePlayer: assignments.find(p => p.player_id === previewState.player1) as TeamAssignment,
            orangePlayer: assignments.find(p => p.player_id === previewState.player2) as TeamAssignment
          }) : null} 
        />
      </div>

      {/* Preview controls - only show when a preview is active */}
      {previewState.active && (
        <PreviewSwapControls 
          isPreviewActive={previewState.active}
          onExecutePreviewSwap={handleExecutePreviewSwap}
          onCancelPreview={handleCancelPreview}
        />
      )}
      
      {/* Optimal Team Generator */}
      <OptimalTeamGenerator
        allPlayers={assignments}
        onApplyTeams={(blueTeam, orangeTeam) => {
          // Update all assignments with the new team assignments
          const updatedAssignments = [...assignments].map(player => {
            const bluePlayer = blueTeam.find(p => p.player_id === player.player_id);
            if (bluePlayer) return { ...player, team: 'blue' };
            
            const orangePlayer = orangeTeam.find(p => p.player_id === player.player_id);
            if (orangePlayer) return { ...player, team: 'orange' };
            
            return player;
          });
          
          updateAssignments(updatedAssignments);
        }}
      />
      
      {/* Metric-focused swap recommendations */}
      {focusMetric && metricImpact && (
        <div className="mb-6 bg-base-100 p-4 rounded-lg border">
          <h3 className="text-lg font-bold mb-2">Metric Impact Analysis</h3>
          <p className="text-sm mb-4">
            Current contribution of each metric to team imbalance. 
            {focusMetric && <span className="font-medium"> Focusing on: <span className="text-primary">{focusMetric}</span></span>}
          </p>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="flex flex-col items-center">
              <div className="text-xs font-medium text-blue-600">Attack</div>
              <div className="text-sm">{(metricImpact.attack * 100).toFixed(1)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, metricImpact.attack * 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-xs font-medium text-green-600">Defense</div>
              <div className="text-sm">{(metricImpact.defense * 100).toFixed(1)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, metricImpact.defense * 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-xs font-medium text-yellow-600">Win Rate</div>
              <div className="text-sm">{(metricImpact.winRate * 100).toFixed(1)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, metricImpact.winRate * 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-xs font-medium text-red-600">Goal Diff</div>
              <div className="text-sm">{(metricImpact.goalDifferential * 100).toFixed(1)}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, metricImpact.goalDifferential * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Swap recommendations */}
      {relevantSwaps.length > 0 && (
        <SwapRecommendations
          swaps={relevantSwaps}
          selectedSwap={selectedSwap}
          onSwapSelect={handleSwapSelect}
          onSwapApply={handleSwapPlayers}
          swapStats={swapStats}
          teamStats={teamStats}
        />
      )}
      
      {/* Selection alert */}
      <PlayerSelectionAlert
        selectedPlayer={selectedPlayer}
        assignments={assignments}
        onCancelSelection={() => setSelectedPlayer(null)}
      />
      
      {/* Team lists */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamList
          teamId="orange"
          team={teams.orangeTeam}
          title="Orange Team"
          selectedPlayer={selectedPlayer}
          previewState={previewState}
          swapRankings={swapRankings}
          onPlayerSelect={handlePlayerSelect}
          onPlayerHover={handlePlayerHover}
          onPreviewRequest={handlePreviewRequest}
          onCancelPreview={handleCancelPreview}
          onExecutePreviewSwap={handleExecutePreviewSwap}
        />
        <TeamList
          teamId="blue"
          team={teams.blueTeam}
          title="Blue Team"
          selectedPlayer={selectedPlayer}
          previewState={previewState}
          swapRankings={swapRankings}
          onPlayerSelect={handlePlayerSelect}
          onPlayerHover={handlePlayerHover}
          onPreviewRequest={handlePreviewRequest}
          onCancelPreview={handleCancelPreview}
          onExecutePreviewSwap={handleExecutePreviewSwap}
        />
      </div>
      
      {/* Action buttons */}
      <BalancingActions
        hasUnsavedChanges={hasUnsavedChanges}
        isLoading={isLoading}
        previewActive={previewState.active}
        onRefresh={fetchData}
        onSave={saveTeamAssignments}
        onExecutePreviewSwap={handleExecutePreviewSwap}
      />
    </div>
  );
};

export default TeamBalancingOverview;
