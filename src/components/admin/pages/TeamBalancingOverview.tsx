import { useCallback, useMemo, useState, useEffect } from 'react';
import { TeamList } from '../team-balancing/TeamList';
import { TeamStats } from '../team-balancing/TeamStats';
import { toast } from 'react-hot-toast';
import { useTeamBalancing } from '../team-balancing/useTeamBalancing';
import { TeamAssignment } from '../team-balancing/types';
import { calculateBestSwaps } from '../team-balancing/teamBalanceUtils';
import { FaWhatsapp } from 'react-icons/fa';

/**
 * TeamBalancingOverview component
 * Main page for team balancing functionality
 * Allows admins to view and modify team assignments
 */
const TeamBalancingOverview = () => {
  const { 
    isLoading, 
    error, 
    assignments,
    updateAssignments,
    saveTeamAssignments,
    hasUnsavedChanges,
    fetchData
  } = useTeamBalancing();

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedSwap, setSelectedSwap] = useState<any | null>(null);
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  
  // Track preview state
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

  // Calculate team stats for display
  const teamStats = useMemo(() => {
    if (!assignments || assignments.length === 0) {
      return {
        blue: { attack: 0, defense: 0, winRate: 0, playerCount: 0 },
        orange: { attack: 0, defense: 0, winRate: 0, playerCount: 0 },
        attackDiff: 0,
        defenseDiff: 0,
        winRateDiff: 0,
        currentScore: 0
      };
    }

    const { blueTeam, orangeTeam } = teams;
    
    // Calculate average stats for each team
    const blueAttack = blueTeam.reduce((sum, p) => sum + p.attack_rating, 0) / blueTeam.length;
    const blueDefense = blueTeam.reduce((sum, p) => sum + p.defense_rating, 0) / blueTeam.length;
    
    // Filter out players with no game history
    const bluePlayersWithHistory = blueTeam.filter(p => p.win_rate !== null && p.win_rate !== undefined);
    const orangePlayersWithHistory = orangeTeam.filter(p => p.win_rate !== null && p.win_rate !== undefined);
    
    const blueWinRate = bluePlayersWithHistory.length > 0 
      ? bluePlayersWithHistory.reduce((sum, p) => sum + (p.win_rate ?? 0), 0) / bluePlayersWithHistory.length 
      : 0;
    
    const orangeAttack = orangeTeam.reduce((sum, p) => sum + p.attack_rating, 0) / orangeTeam.length;
    const orangeDefense = orangeTeam.reduce((sum, p) => sum + p.defense_rating, 0) / orangeTeam.length;
    
    const orangeWinRate = orangePlayersWithHistory.length > 0 
      ? orangePlayersWithHistory.reduce((sum, p) => sum + (p.win_rate ?? 0), 0) / orangePlayersWithHistory.length 
      : 0;
    
    // Calculate differences between teams
    const attackDiff = Math.abs(blueAttack - orangeAttack);
    const defenseDiff = Math.abs(blueDefense - orangeDefense);
    
    // Only calculate win rate difference if both teams have players with history
    const rawWinRateDiff = (bluePlayersWithHistory.length > 0 && orangePlayersWithHistory.length > 0)
      ? Math.abs(blueWinRate - orangeWinRate)
      : 0;
      
    const weightedWinRateDiff = rawWinRateDiff * 5; // Apply weight to win rate for scoring
      
    // Calculate overall balance score (lower is better)
    const currentScore = attackDiff + defenseDiff + weightedWinRateDiff;
    
    return {
      blue: { 
        attack: blueAttack, 
        defense: blueDefense, 
        winRate: blueWinRate,
        playerCount: blueTeam.length 
      },
      orange: { 
        attack: orangeAttack, 
        defense: orangeDefense, 
        winRate: orangeWinRate,
        playerCount: orangeTeam.length
      },
      attackDiff,
      defenseDiff,
      winRateDiff: rawWinRateDiff, // Store unweighted diff for display
      currentScore
    };
  }, [teams, assignments]);

  // Calculate swap rankings when a player is selected
  const swapRankings = useMemo(() => {
    if (!selectedPlayer || !assignments) return null;

    const selectedPlayerData = assignments.find(p => p.player_id === selectedPlayer);
    if (!selectedPlayerData) return null;

    return calculateBestSwaps(selectedPlayerData, assignments);
  }, [selectedPlayer, assignments]);

  // Calculate recommended swaps based on current team assignments
  const recommendedSwaps = useMemo(() => {
    if (!assignments || assignments.length === 0) return [];
    
    const blueTeam = assignments.filter(p => p.team === 'blue');
    const orangeTeam = assignments.filter(p => p.team === 'orange');
    
    // Generate all possible swap pairs
    const possibleSwaps: Array<{
      bluePlayer: TeamAssignment,
      orangePlayer: TeamAssignment,
      improvementScore: number,
      newScore: number
    }> = [];
    
    for (const bluePlayer of blueTeam) {
      for (const orangePlayer of orangeTeam) {
        // Calculate improvement score - how much this swap improves balance
        const blueTeamCopy = [...blueTeam].filter(p => p.player_id !== bluePlayer.player_id).concat([orangePlayer]);
        const orangeTeamCopy = [...orangeTeam].filter(p => p.player_id !== orangePlayer.player_id).concat([bluePlayer]);
        
        // Ensure teams remain the same size
        if (blueTeamCopy.length !== orangeTeamCopy.length) {
          continue;
        }
        
        const blueAttack = blueTeamCopy.reduce((sum, p) => sum + p.attack_rating, 0) / blueTeamCopy.length;
        const blueDefense = blueTeamCopy.reduce((sum, p) => sum + p.defense_rating, 0) / blueTeamCopy.length;
        
        // Filter out players with no game history for win rate calculation
        const bluePlayersWithHistory = blueTeamCopy.filter(p => p.win_rate !== null && p.win_rate !== undefined);
        const orangePlayersWithHistory = orangeTeamCopy.filter(p => p.win_rate !== null && p.win_rate !== undefined);
        
        const blueWinRate = bluePlayersWithHistory.length > 0 
          ? bluePlayersWithHistory.reduce((sum, p) => sum + (p.win_rate ?? 0), 0) / bluePlayersWithHistory.length 
          : 0;
        
        const orangeAttack = orangeTeamCopy.reduce((sum, p) => sum + p.attack_rating, 0) / orangeTeamCopy.length;
        const orangeDefense = orangeTeamCopy.reduce((sum, p) => sum + p.defense_rating, 0) / orangeTeamCopy.length;
        
        const orangeWinRate = orangePlayersWithHistory.length > 0 
          ? orangePlayersWithHistory.reduce((sum, p) => sum + (p.win_rate ?? 0), 0) / orangePlayersWithHistory.length 
          : 0;
        
        // Calculate diffs
        const attackDiff = Math.abs(blueAttack - orangeAttack);
        const defenseDiff = Math.abs(blueDefense - orangeDefense);
        
        // Only calculate win rate difference if both teams have players with history
        const winRateDiff = (bluePlayersWithHistory.length > 0 && orangePlayersWithHistory.length > 0)
          ? Math.abs(blueWinRate - orangeWinRate)
          : 0;
          
        const weightedWinRateDiff = winRateDiff * 5; // Apply weight to win rate
        const newScore = attackDiff + defenseDiff + weightedWinRateDiff;
        const improvementScore = teamStats.currentScore - newScore;
        
        if (improvementScore > 0) {
          possibleSwaps.push({
            bluePlayer,
            orangePlayer,
            improvementScore,
            newScore
          });
        }
      }
    }
    
    // Get unique swaps (avoid duplicates)
    const uniqueSwaps: Array<{
      bluePlayer: TeamAssignment,
      orangePlayer: TeamAssignment,
      improvementScore: number,
      newScore: number
    }> = [];
    const swapSet = new Set<string>();
    
    for (const swap of possibleSwaps) {
      const key = `${swap.bluePlayer.player_id}_${swap.orangePlayer.player_id}`;
      if (!swapSet.has(key)) {
        swapSet.add(key);
        uniqueSwaps.push(swap);
      }
    }
    
    return uniqueSwaps.sort((a, b) => b.improvementScore - a.improvementScore);
  }, [assignments, teamStats.currentScore]);

  // Calculate the expected stats for a recommended swap
  const calculateSwapStats = (swapToCalculate: { bluePlayer: TeamAssignment, orangePlayer: TeamAssignment }) => {
    if (!assignments) return null;
    
    // Create a copy of assignments with the swap applied
    const updatedAssignments = assignments.map(player => {
      if (player.player_id === swapToCalculate.bluePlayer.player_id) {
        return { ...player, team: 'orange' as 'orange' }; // Move blue player to orange
      } else if (player.player_id === swapToCalculate.orangePlayer.player_id) {
        return { ...player, team: 'blue' as 'blue' }; // Move orange player to blue
      }
      return player;
    });
    
    // Recalculate team stats with the updated assignments
    const blueTeam = updatedAssignments.filter(p => p.team === 'blue');
    const orangeTeam = updatedAssignments.filter(p => p.team === 'orange');
    
    // Verify teams are still the same size
    if (blueTeam.length !== orangeTeam.length) {
      console.warn('Team sizes are not equal after swap!');
    }
    
    const blueAttack = blueTeam.reduce((sum, p) => sum + p.attack_rating, 0) / blueTeam.length;
    const blueDefense = blueTeam.reduce((sum, p) => sum + p.defense_rating, 0) / blueTeam.length;
    
    // Filter out players with no game history
    const bluePlayersWithHistory = blueTeam.filter(p => p.win_rate !== null && p.win_rate !== undefined);
    const orangePlayersWithHistory = orangeTeam.filter(p => p.win_rate !== null && p.win_rate !== undefined);
    
    const blueWinRate = bluePlayersWithHistory.length > 0 
      ? bluePlayersWithHistory.reduce((sum, p) => sum + (p.win_rate ?? 0), 0) / bluePlayersWithHistory.length 
      : 0;
    
    const orangeAttack = orangeTeam.reduce((sum, p) => sum + p.attack_rating, 0) / orangeTeam.length;
    const orangeDefense = orangeTeam.reduce((sum, p) => sum + p.defense_rating, 0) / orangeTeam.length;
    
    const orangeWinRate = orangePlayersWithHistory.length > 0 
      ? orangePlayersWithHistory.reduce((sum, p) => sum + (p.win_rate ?? 0), 0) / orangePlayersWithHistory.length 
      : 0;
    
    // Calculate differences between teams
    const attackDiff = Math.abs(blueAttack - orangeAttack);
    const defenseDiff = Math.abs(blueDefense - orangeDefense);
    
    // Only calculate win rate difference if both teams have players with history
    const rawWinRateDiff = (bluePlayersWithHistory.length > 0 && orangePlayersWithHistory.length > 0)
      ? Math.abs(blueWinRate - orangeWinRate)
      : 0;
      
    const winRateDiff = rawWinRateDiff * 5; // Apply weight to win rate for the score
    
    // Lower score is better
    const newScore = attackDiff + defenseDiff + winRateDiff;
    
    return {
      blue: {
        attack: blueAttack,
        defense: blueDefense,
        winRate: blueWinRate,
        playerCount: blueTeam.length
      },
      orange: {
        attack: orangeAttack,
        defense: orangeDefense,
        winRate: orangeWinRate,
        playerCount: orangeTeam.length
      },
      attackDiff,
      defenseDiff,
      winRateDiff: rawWinRateDiff, // Return the unweighted diff for display
      totalDiff: newScore,
      improvement: teamStats.currentScore - newScore
    };
  };

  // Calculate stats for a potential manual swap
  const calculateManualSwapStats = useCallback((player1Id: string, player2Id: string) => {
    if (!assignments) return null;
    
    const player1 = assignments.find(p => p.player_id === player1Id);
    const player2 = assignments.find(p => p.player_id === player2Id);
    
    if (!player1 || !player2) return null;
    
    return calculateSwapStats({
      bluePlayer: player1.team === 'blue' ? player1 : player2,
      orangePlayer: player1.team === 'orange' ? player1 : player2
    });
  }, [assignments, calculateSwapStats]);

  // Preview stats for a potential manual swap
  const [previewSwapStats, setPreviewSwapStats] = useState<any>(null);

  // Handle direct preview request from a player card
  const handlePreviewRequest = useCallback((playerId: string) => {
    // If a player is already temporarily selected for preview, preview swap with that player
    if (previewState.player1 && previewState.player1 !== playerId) {
      // Get the teams of both players
      const player1 = assignments?.find(p => p.player_id === previewState.player1);
      const player2 = assignments?.find(p => p.player_id === playerId);
      
      // Only proceed if players are from different teams
      if (player1 && player2 && player1.team !== player2.team) {
        // Calculate the preview stats
        const stats = calculateManualSwapStats(previewState.player1, playerId);
        
        // Update the preview state
        setPreviewState({
          player1: previewState.player1,
          player2: playerId,
          active: true
        });
        
        // Show the preview stats
        setPreviewSwapStats(stats);
      } else {
        // If same team, just update the first player
        setPreviewState({
          player1: playerId,
          player2: null,
          active: false
        });
        setPreviewSwapStats(null);
      }
    } 
    // If a player is formally selected, preview swap with that player
    else if (selectedPlayer && selectedPlayer !== playerId) {
      // Calculate the preview stats
      const stats = calculateManualSwapStats(selectedPlayer, playerId);
      
      // Show the preview stats
      setPreviewSwapStats(stats);
    } 
    // If no player is selected yet, temporarily select this one
    else {
      setPreviewState({
        player1: playerId,
        player2: null,
        active: false
      });
    }
  }, [selectedPlayer, previewState, assignments, calculateManualSwapStats]);

  // Handle canceling a preview
  const handleCancelPreview = useCallback(() => {
    setPreviewState({
      player1: null,
      player2: null,
      active: false
    });
    setPreviewSwapStats(null);
  }, []);

  // Update preview when player is selected
  useEffect(() => {
    if (selectedPlayer && hoveredPlayer && selectedPlayer !== hoveredPlayer) {
      // Get the players
      const player1 = assignments?.find(p => p.player_id === selectedPlayer);
      const player2 = assignments?.find(p => p.player_id === hoveredPlayer);
      
      // Only proceed if players are from different teams
      if (player1 && player2 && player1.team !== player2.team) {
        const stats = calculateManualSwapStats(selectedPlayer, hoveredPlayer);
        setPreviewSwapStats(stats);
      } else {
        setPreviewSwapStats(null);
      }
    } else {
      // Don't clear preview if it's coming from the preview state
      if (!previewState.active) {
        setPreviewSwapStats(null);
      }
    }
  }, [selectedPlayer, hoveredPlayer, assignments, calculateManualSwapStats, previewState.active]);

  // Update hoveredPlayer state
  const handlePlayerHover = useCallback((playerId: string | null) => {
    setHoveredPlayer(playerId);
  }, []);

  const handlePlayerSelect = useCallback((playerId: string) => {
    if (selectedPlayer === playerId) {
      setSelectedPlayer(null);
      return;
    }

    if (!selectedPlayer) {
      setSelectedPlayer(playerId);
      return;
    }

    if (!assignments) return;

    const player1 = assignments.find(p => p.player_id === selectedPlayer);
    const player2 = assignments.find(p => p.player_id === playerId);

    if (!player1 || !player2) {
      toast.error('Could not find selected players');
      setSelectedPlayer(null);
      return;
    }

    if (player1.team === player2.team) {
      toast.error('Please select players from different teams');
      setSelectedPlayer(null);
      return;
    }

    const updatedAssignments = assignments.map(player => {
      if (player.player_id === player1.player_id) {
        return { ...player, team: player2.team };
      }
      if (player.player_id === player2.player_id) {
        return { ...player, team: player1.team };
      }
      return player;
    });

    updateAssignments(updatedAssignments);
    setSelectedPlayer(null);
    toast.success(`Swapped ${player1.friendly_name} with ${player2.friendly_name}`);
  }, [selectedPlayer, assignments, updateAssignments]);

  // Handle swap selection for before/after comparison
  const handleSwapSelect = useCallback((swap: any) => {
    setSelectedSwap(swap);
  }, []);

  // Compute the comparison stats for selected swap
  const comparisonStats = useMemo(() => {
    return selectedSwap ? calculateSwapStats(selectedSwap) : null;
  }, [selectedSwap, calculateSwapStats]);

  const handleSwapPlayers = (swap: any) => {
    // Create a new array of assignments with the swap applied
    if (!assignments) return;
    
    const updatedAssignments = assignments.map(player => {
      if (player.player_id === swap.bluePlayer.player_id) {
        return { ...player, team: 'orange' as 'orange' }; // Move blue player to orange
      } else if (player.player_id === swap.orangePlayer.player_id) {
        return { ...player, team: 'blue' as 'blue' }; // Move orange player to blue
      }
      return player;
    });
    
    // Update assignments with the new array that includes both swapped players
    updateAssignments(updatedAssignments);
    toast.success('Players swapped!');
    setSelectedSwap(null);
  };

  // Handle executing a previewed swap
  const handleExecutePreviewSwap = useCallback(() => {
    if (previewState.player1 && previewState.player2 && previewState.active) {
      // Get the players
      const player1 = assignments?.find(p => p.player_id === previewState.player1);
      const player2 = assignments?.find(p => p.player_id === previewState.player2);
      
      if (player1 && player2) {
        // Execute the swap
        const newAssignments = assignments.map(p => {
          if (p.player_id === player1.player_id) {
            return { ...p, team: player2.team };
          } else if (p.player_id === player2.player_id) {
            return { ...p, team: player1.team };
          }
          return p;
        });
        
        // Update assignments
        updateAssignments(newAssignments);
        
        // Show success toast
        toast.success(`Swapped ${player1.friendly_name} with ${player2.friendly_name}`);
        
        // Clear preview state
        setPreviewState({
          player1: null,
          player2: null,
          active: false
        });
        setPreviewSwapStats(null);
      }
    }
  }, [previewState, assignments, updateAssignments]);

  // Handle copying team balance information to clipboard for WhatsApp
  const handleWhatsAppShare = useCallback(() => {
    if (!assignments || assignments.length === 0 || !teamStats) {
      toast.error('No team data available to share');
      return;
    }

    try {
      // Get team members
      const orangeTeam = assignments.filter(p => p.team === 'orange')
        .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
      const blueTeam = assignments.filter(p => p.team === 'blue')
        .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));

      // Format the message
      let message = `📋 *Proposed Teams For Next Game*\n\n`;
      
      // Orange Team Stats
      message += `🟠 *Orange Team*\n`;
      message += `⚔️ Attack: ${teamStats.orange.attack.toFixed(1)}\n`;
      message += `🛡️ Defense: ${teamStats.orange.defense.toFixed(1)}\n`;
      message += `🏆 Win Rate: ${teamStats.orange.winRate.toFixed(1)}%\n\n`;
      
      // Blue Team Stats
      message += `🔵 *Blue Team*\n`;
      message += `⚔️ Attack: ${teamStats.blue.attack.toFixed(1)}\n`;
      message += `🛡️ Defense: ${teamStats.blue.defense.toFixed(1)}\n`;
      message += `🏆 Win Rate: ${teamStats.blue.winRate.toFixed(1)}%\n\n`;
      
      // Differences
      message += `📊 *Differences*\n`;
      message += `⚔️ Attack Diff: ${teamStats.attackDiff.toFixed(1)}\n`;
      message += `🛡️ Defense Diff: ${teamStats.defenseDiff.toFixed(1)}\n`;
      message += `🏆 Win Rate Diff: ${teamStats.winRateDiff.toFixed(1)}%\n`;
      message += `⚖️ Balance Score: ${teamStats.currentScore.toFixed(1)}\n\n`;
      
      // Orange Team Players
      message += `🟠 *Orange Team (${orangeTeam.length})*:\n`;
      orangeTeam.forEach(player => {
        message += `👤 ${player.friendly_name}\n`;
      });
      
      message += `\n🔵 *Blue Team (${blueTeam.length})*:\n`;
      blueTeam.forEach(player => {
        message += `👤 ${player.friendly_name}\n`;
      });
      
      // Copy to clipboard
      navigator.clipboard.writeText(message);
      toast.success('Team balance information copied to clipboard!');
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      toast.error('Failed to copy message to clipboard');
    }
  }, [assignments, teamStats]);

  if (isLoading) {
    return <div className="text-center p-4">Loading teams...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-error">{error}</div>;
  }

  if (!assignments || assignments.length === 0) {
    return <div className="text-center p-4">No players assigned to teams yet.</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Team Balance Overview</h2>
        {assignments && assignments.length > 0 && (
          <button
            className="btn btn-sm btn-success"
            aria-label="Share on WhatsApp"
            onClick={handleWhatsAppShare}
          >
            <FaWhatsapp className="text-lg mr-2" /> Share Teams
          </button>
        )}
      </div>
      
      <TeamStats stats={teamStats} comparisonStats={comparisonStats} previewSwapStats={previewSwapStats} />

      {recommendedSwaps && recommendedSwaps.length > 0 && (
        <div className="space-y-4">
          <div className="alert alert-info">
            <div>
              <h3 className="font-bold">Recommended Player Swaps</h3>
              <p className="text-sm">The following swaps would improve team balance. Lower balance score is better.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedSwaps.slice(0, 4).map((swap, index) => {
              const swapStats = calculateSwapStats(swap);
              return (
                <div 
                  key={`${swap.bluePlayer.player_id}_${swap.orangePlayer.player_id}`}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedSwap === swap ? 'border-primary bg-primary bg-opacity-10' : 'border-base-300 hover:border-primary'
                  }`}
                  onClick={() => handleSwapSelect(swap)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">Swap #{index + 1}</h4>
                      <p className="text-sm opacity-70">
                        Improvement: {swap.improvementScore.toFixed(1)} points (Higher is better)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-success text-success-content px-2 py-1 rounded-full bg-opacity-20">
                        Score: {teamStats.currentScore.toFixed(1)} → {swap.newScore.toFixed(1)} (Lower is better)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-500">Blue → Orange</p>
                      <p>{swap.bluePlayer.friendly_name}</p>
                      <div className="text-xs opacity-70">
                        <p>Attack: {swap.bluePlayer.attack_rating.toFixed(1)}</p>
                        <p>Defense: {swap.bluePlayer.defense_rating.toFixed(1)}</p>
                        <p>Win Rate: {(swap.bluePlayer.win_rate || 0).toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-500">Orange → Blue</p>
                      <p>{swap.orangePlayer.friendly_name}</p>
                      <div className="text-xs opacity-70">
                        <p>Attack: {swap.orangePlayer.attack_rating.toFixed(1)}</p>
                        <p>Defense: {swap.orangePlayer.defense_rating.toFixed(1)}</p>
                        <p>Win Rate: {(swap.orangePlayer.win_rate || 0).toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                  
                  {swapStats && (
                    <div className="text-xs border-t pt-2">
                      <p className="font-medium mb-1">Balance Improvements:</p>
                      <div className="grid grid-cols-3 gap-1">
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
                          <p>Win Rate: {teamStats.winRateDiff.toFixed(1)} → {swapStats.winRateDiff.toFixed(1)}</p>
                          <p className={`${swapStats.winRateDiff < teamStats.winRateDiff ? 'text-success' : 'text-error'}`}>
                            {swapStats.winRateDiff < teamStats.winRateDiff ? '✓ Better' : '✗ Worse'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end mt-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwapPlayers(swap);
                      }}
                    >
                      Apply Swap
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {selectedPlayer && (
        <div className="alert alert-info mb-4">
          <div>
            <span>Select another player to swap with {
              assignments.find(p => p.player_id === selectedPlayer)?.friendly_name
            }. The best swaps are highlighted and ranked.</span>
            <button 
              className="btn btn-ghost btn-sm ml-4"
              onClick={() => setSelectedPlayer(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
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
      <div className="flex justify-center mt-8">
        <button
          className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
          onClick={() => {
            toast.promise(
              fetchData(),
              {
                loading: 'Refreshing team data...',
                success: 'Team data updated successfully',
                error: 'Failed to refresh team data'
              }
            );
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Team Data'}
        </button>
        {hasUnsavedChanges && (
          <button
            className="btn btn-primary ml-2"
            onClick={() => {
              toast.promise(
                saveTeamAssignments(),
                {
                  loading: 'Saving team assignments...',
                  success: 'Team assignments saved successfully',
                  error: 'Failed to save team assignments'
                }
              );
            }}
          >
            Save Changes
          </button>
        )}
        {previewState.active && (
          <button
            className="btn btn-primary ml-2"
            onClick={handleExecutePreviewSwap}
          >
            Execute Previewed Swap
          </button>
        )}
      </div>
    </div>
  );
};

export default TeamBalancingOverview;
