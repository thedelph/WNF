import React, { useCallback, useMemo, useState } from 'react';
import { TeamList } from '../team-balancing/TeamList';
import { TeamStats } from '../team-balancing/TeamStats';
import { toast } from 'react-hot-toast';
import { useTeamBalancing } from '../team-balancing/useTeamBalancing';
import { calculateBestSwaps, findOptimalTeamBalance } from '../team-balancing/teamBalanceUtils';
import { calculateBalanceScore } from '../../../utils/teamBalancing';

const TeamBalancingOverview: React.FC = () => {
  const {
    isLoading,
    error,
    assignments,
    updateAssignments,
    fetchData
  } = useTeamBalancing();

  // Track selected players for swapping
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Calculate optimal team balance
  const optimalBalance = useMemo(() => {
    if (!assignments || assignments.length === 0) return null;
    return findOptimalTeamBalance(assignments);
  }, [assignments]);

  // Memoize filtered teams to prevent unnecessary recalculations
  const teams = useMemo(() => {
    if (!assignments) return { blueTeam: [], orangeTeam: [] };
    return {
      blueTeam: assignments.filter((p) => p.team === 'blue'),
      orangeTeam: assignments.filter((p) => p.team === 'orange'),
    };
  }, [assignments]);

  // Calculate team stats for display
  const teamStats = useMemo(() => {
    const { blueTeam, orangeTeam } = teams;
    const blueStats = {
      attackTotal: blueTeam.reduce((sum, p) => sum + p.attack_rating, 0),
      defenseTotal: blueTeam.reduce((sum, p) => sum + p.defense_rating, 0),
      playerCount: blueTeam.length,
    };

    const orangeStats = {
      attackTotal: orangeTeam.reduce((sum, p) => sum + p.attack_rating, 0),
      defenseTotal: orangeTeam.reduce((sum, p) => sum + p.defense_rating, 0),
      playerCount: orangeTeam.length,
    };

    // Calculate average ratings per player for each team
    const blueAvgAttack = blueStats.attackTotal / blueStats.playerCount;
    const blueAvgDefense = blueStats.defenseTotal / blueStats.playerCount;
    const orangeAvgAttack = orangeStats.attackTotal / orangeStats.playerCount;
    const orangeAvgDefense = orangeStats.defenseTotal / orangeStats.playerCount;

    const attackDiff = Math.abs(blueStats.attackTotal - orangeStats.attackTotal);
    const defenseDiff = Math.abs(blueStats.defenseTotal - orangeStats.defenseTotal);
    const avgAttackDiff = Math.abs(blueAvgAttack - orangeAvgAttack);
    const avgDefenseDiff = Math.abs(blueAvgDefense - orangeAvgDefense);

    // Calculate current balance score using same formula as teamBalanceUtils
    const currentScore = attackDiff + defenseDiff + (avgAttackDiff + avgDefenseDiff) * 10;

    return {
      blue: blueStats,
      orange: orangeStats,
      attackDiff,
      defenseDiff,
      currentScore
    };
  }, [teams]);

  // Calculate swap rankings when a player is selected
  const swapRankings = useMemo(() => {
    if (!selectedPlayer || !assignments) return null;

    const selectedPlayerData = assignments.find(p => p.player_id === selectedPlayer);
    if (!selectedPlayerData) return null;

    return calculateBestSwaps(selectedPlayerData, assignments);
  }, [selectedPlayer, assignments]);

  // Calculate recommended swaps based on optimal balance
  const recommendedSwaps = useMemo(() => {
    if (!optimalBalance || !assignments) return null;
    
    const currentTeams = {
      blue: assignments.filter(p => p.team === 'blue'),
      orange: assignments.filter(p => p.team === 'orange')
    };

    const optimalTeams = {
      blue: optimalBalance.blueTeam,
      orange: optimalBalance.orangeTeam
    };

    // Find players that are in different teams in the optimal balance
    const swaps: Array<{
      bluePlayer: typeof assignments[0],
      orangePlayer: typeof assignments[0],
      improvementScore: number
    }> = [];

    // For each player currently in blue team
    currentTeams.blue.forEach(currentBluePlayer => {
      // If they should be in orange according to optimal balance
      if (optimalTeams.orange.find(p => p.player_id === currentBluePlayer.player_id)) {
        // Find a player from orange team that should be in blue
        const potentialOrangeSwap = currentTeams.orange.find(orangePlayer => 
          optimalTeams.blue.find(op => op.player_id === orangePlayer.player_id)
        );
        
        if (potentialOrangeSwap) {
          // Calculate the improvement in balance from this swap
          const updatedAssignments = assignments.map(player => {
            if (player.player_id === currentBluePlayer.player_id) return { ...player, team: 'orange' };
            if (player.player_id === potentialOrangeSwap.player_id) return { ...player, team: 'blue' };
            return player;
          });

          const currentScore = teamStats.currentScore;
          const newScore = calculateBalanceScore(
            updatedAssignments.filter(p => p.team === 'blue'),
            updatedAssignments.filter(p => p.team === 'orange')
          );

          const improvement = currentScore - newScore;
          
          // Only suggest swaps that actually improve the balance
          if (improvement > 0) {
            swaps.push({
              bluePlayer: potentialOrangeSwap, // The orange player that should move to blue
              orangePlayer: currentBluePlayer, // The blue player that should move to orange
              improvementScore: improvement
            });
          }
        }
      }
    });

    // Remove duplicate swaps and sort by improvement score
    const uniqueSwaps = swaps.filter((swap, index, self) => 
      index === self.findIndex(s => 
        (s.bluePlayer.player_id === swap.bluePlayer.player_id && 
         s.orangePlayer.player_id === swap.orangePlayer.player_id) ||
        (s.bluePlayer.player_id === swap.orangePlayer.player_id && 
         s.orangePlayer.player_id === swap.bluePlayer.player_id)
      )
    );

    return uniqueSwaps.sort((a, b) => b.improvementScore - a.improvementScore);
  }, [optimalBalance, assignments, teamStats.currentScore]);

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
    toast.success('Players swapped successfully');
  }, [selectedPlayer, assignments, updateAssignments]);

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
      <h2 className="text-2xl font-bold mb-6">Team Balance Overview</h2>
      
      <TeamStats stats={teamStats} />

      {optimalBalance && optimalBalance.score < teamStats.currentScore - 0.5 && (
        <div className="space-y-4">
          <div className="alert alert-info">
            <div>
              <span>A better team balance is possible! Here are the recommended swaps:</span>
            </div>
          </div>
          
          <div className="grid gap-4">
            {recommendedSwaps?.map(({ bluePlayer, orangePlayer, improvementScore }, index) => (
              <div key={index} className="card bg-base-200">
                <div className="card-body">
                  <h3 className="card-title text-lg">Recommended Swap {index + 1}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold">Move to Orange Team:</p>
                      <div className="stat bg-base-100 rounded-lg">
                        <div className="stat-title">{orangePlayer.friendly_name}</div>
                        <div className="stat-desc">
                          Attack: {orangePlayer.attack_rating} | Defense: {orangePlayer.defense_rating}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold">Move to Blue Team:</p>
                      <div className="stat bg-base-100 rounded-lg">
                        <div className="stat-title">{bluePlayer.friendly_name}</div>
                        <div className="stat-desc">
                          Attack: {bluePlayer.attack_rating} | Defense: {bluePlayer.defense_rating}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-success">
                      Balance improvement: {improvementScore.toFixed(2)} points
                    </p>
                  </div>
                  <div className="card-actions justify-end mt-4">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        handlePlayerSelect(bluePlayer.player_id);
                        setTimeout(() => handlePlayerSelect(orangePlayer.player_id), 100);
                      }}
                    >
                      Make This Swap
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
          swapRankings={swapRankings}
          onPlayerSelect={handlePlayerSelect}
        />
        <TeamList
          teamId="blue"
          team={teams.blueTeam}
          title="Blue Team"
          selectedPlayer={selectedPlayer}
          swapRankings={swapRankings}
          onPlayerSelect={handlePlayerSelect}
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
      </div>
    </div>
  );
};

export default TeamBalancingOverview;
