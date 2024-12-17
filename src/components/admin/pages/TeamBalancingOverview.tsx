import React, { useEffect, useState } from 'react';
import { supabase } from "../../../utils/supabase";
import { format } from 'date-fns';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { showDialog, useNavigate } from "../../../utils/dialog";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { GameDetails } from "../../../components/game/GameDetails";

interface TeamStats {
  avgAttack: number;
  avgDefense: number;
  totalAttack: number;
  totalDefense: number;
}

interface TeamAssignment {
  player_id: string;
  team: 'blue' | 'orange' | null;
  friendly_name: string;
  attack_rating: number;
  defense_rating: number;
}

interface Game {
  id: string;
  date: string;
  venues: {
    name: string;
  };
  team_assignments?: TeamAssignmentData;
}

interface TeamAssignmentData {
  teams: TeamAssignment[];
  stats: {
    blue: TeamStats;
    orange: TeamStats;
  };
  selection_metadata: {
    startTime: string;
    endTime: string;
    meritSlots: number;
    randomSlots: number;
    selectionNotes: string[];
  };
}

interface PlayerSwapSuggestion {
  bluePlayer: TeamAssignment;
  orangePlayer: TeamAssignment;
  attackDiffImprovement: number;
  defenseDiffImprovement: number;
  totalDiffImprovement: number;
}

const TeamBalancingOverview: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlayerSwapSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlayerSwapSuggestion | null>(null);
  const [isProcessingDropout, setIsProcessingDropout] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch upcoming games first
        const now = new Date().toISOString();
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('*, venues(name)')
          .gte('date', now)
          .order('date')
          .limit(1)
          .single();

        if (gamesError) {
          console.error('Error fetching game:', gamesError);
          throw gamesError;
        }
        console.log('Game data:', gamesData);
        setGame(gamesData);

        const gameId = gamesData.id;

        // Fetch team assignments if they exist
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('balanced_team_assignments')
          .select('*')
          .eq('game_id', gameId)
          .single();

        console.log('Existing assignments:', assignmentData);

        // If we have existing assignments, fetch those players
        if (assignmentData?.team_assignments?.teams) {
          const existingTeams = assignmentData.team_assignments.teams;
          console.log('Using existing team assignments:', existingTeams);
          
          // Also fetch current registrations to get reserve players
          const { data: registrations, error: registrationError } = await supabase
            .from('game_registrations')
            .select(`
              *,
              status,
              players!game_registrations_player_id_fkey (
                id,
                friendly_name,
                attack_rating,
                defense_rating
              )
            `)
            .eq('game_id', gameId)
            .eq('status', 'reserve');

          if (registrationError) {
            console.error('Error fetching reserve registrations:', registrationError);
          } else {
            console.log('Reserve registrations:', registrations);
          }
          
          // Get all player IDs from existing teams to avoid duplicates
          const existingPlayerIds = new Set(existingTeams.map((player: any) => player.player_id));
          
          // Convert existing assignments to our format and add reserve players
          const initialAssignments: TeamAssignment[] = [
            ...existingTeams.map((player: any) => ({
              player_id: player.player_id,
              friendly_name: player.friendly_name,
              attack_rating: player.attack_rating || 0,
              defense_rating: player.defense_rating || 0,
              team: player.team
            })),
            ...(registrations || [])
              .filter((reg: any) => !existingPlayerIds.has(reg.player_id)) // Only add reserves that aren't already in teams
              .map((reg: any) => ({
                player_id: reg.player_id,
                friendly_name: reg.players.friendly_name,
                attack_rating: reg.players.attack_rating || 0,
                defense_rating: reg.players.defense_rating || 0,
                team: null // Reserve players
              }))
          ];

          console.log('Final assignments including reserves:', initialAssignments);
          setAssignments(initialAssignments);
        } else {
          // If no assignments exist, fetch all registered players
          const { data: registrations, error: registrationError } = await supabase
            .from('game_registrations')
            .select(`
              *,
              status,
              players!game_registrations_player_id_fkey (
                id,
                friendly_name,
                attack_rating,
                defense_rating
              )
            `)
            .eq('game_id', gameId);

          if (registrationError) {
            console.error('Error fetching registrations:', registrationError);
            throw registrationError;
          }
          console.log('Registrations:', registrations);

          // Convert registrations to team assignments, separating confirmed and reserve players
          const initialAssignments: TeamAssignment[] = registrations
            .filter((reg: any) => reg.status === 'confirmed' || reg.status === 'reserve')
            .map((reg: any) => ({
              player_id: reg.player_id,
              friendly_name: reg.players.friendly_name,
              attack_rating: reg.players.attack_rating || 0,
              defense_rating: reg.players.defense_rating || 0,
              team: reg.status === 'reserve' ? null : (Math.random() < 0.5 ? 'blue' : 'orange')
            }));

          console.log('Final assignments from registrations:', initialAssignments);
          setAssignments(initialAssignments);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load game data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [lastSaveTime]); // Add lastSaveTime as a dependency to trigger refresh

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !game) return;

    const { source, destination, draggableId } = result;
    const updatedAssignments = [...assignments];
    
    console.log('Drag operation:', { source, destination, draggableId });
    console.log('Current assignments before update:', updatedAssignments);
    
    // Find the player in the assignments
    const playerIndex = updatedAssignments.findIndex(p => p.player_id === draggableId);
    if (playerIndex === -1) {
      console.error('Player not found:', draggableId);
      return;
    }
    
    // Update the team assignment
    const newTeam = destination.droppableId === 'reserve' ? null : destination.droppableId as 'blue' | 'orange';
    updatedAssignments[playerIndex] = {
      ...updatedAssignments[playerIndex],
      team: newTeam
    };

    console.log('Updated assignments after team change:', updatedAssignments);

    // Update local state and mark as unsaved
    setAssignments(updatedAssignments);
    setHasUnsavedChanges(true);
    console.log('Local state updated with new assignments');
  };

  const handleSaveChanges = async () => {
    if (!game) return;
    const gameId = game.id;

    setIsSaving(true);
    try {
      // Check if a record already exists for this game
      const { data: existingRecord, error: checkError } = await supabase
        .from('balanced_team_assignments')
        .select('*')
        .eq('game_id', gameId)
        .single();

      console.log('Existing record check:', { existingRecord, checkError });

      // Create team assignments data structure
      const teamAssignmentsData = {
        teams: assignments.filter(p => p.team !== null).map(player => ({
          player_id: player.player_id,
          friendly_name: player.friendly_name,
          attack_rating: player.attack_rating,
          defense_rating: player.defense_rating,
          team: player.team
        }))
      };

      console.log('Team assignments data to save:', teamAssignmentsData);
      console.log('Team sizes - Blue:', teamAssignmentsData.teams.filter(p => p.team === 'blue').length,
                  'Orange:', teamAssignmentsData.teams.filter(p => p.team === 'orange').length);

      let updateResult;
      if (existingRecord) {
        // If record exists, update it
        updateResult = await supabase
          .from('balanced_team_assignments')
          .update({
            team_assignments: teamAssignmentsData,
            attack_differential: calculateTeamDifferential(assignments, 'attack_rating'),
            defense_differential: calculateTeamDifferential(assignments, 'defense_rating'),
            total_differential: calculateTotalDifferential(assignments)
          })
          .eq('game_id', gameId);
      } else {
        // If no record exists, insert a new one
        updateResult = await supabase
          .from('balanced_team_assignments')
          .insert({
            game_id: gameId,
            team_assignments: teamAssignmentsData,
            attack_differential: calculateTeamDifferential(assignments, 'attack_rating'),
            defense_differential: calculateTeamDifferential(assignments, 'defense_rating'),
            total_differential: calculateTotalDifferential(assignments)
          });
      }

      if (updateResult.error) {
        console.error('Failed to save team assignments:', updateResult.error);
        throw updateResult.error;
      }

      // After successful save, fetch the latest data to ensure we're in sync
      const { data: latestData, error: latestError } = await supabase
        .from('balanced_team_assignments')
        .select('*')
        .eq('game_id', gameId)
        .single();

      if (latestError) {
        console.error('Error fetching latest data:', latestError);
      } else {
        console.log('Latest data after save:', latestData);
        // Update local state with the latest data
        if (latestData?.team_assignments?.teams) {
          const latestTeams = latestData.team_assignments.teams;
          const updatedAssignments = assignments.map(player => {
            const latestTeamAssignment = latestTeams.find(t => t.player_id === player.player_id);
            return latestTeamAssignment ? { ...player, team: latestTeamAssignment.team } : player;
          });
          setAssignments(updatedAssignments);
        }
      }

      setHasUnsavedChanges(false);
      setLastSaveTime(new Date().toISOString());
      console.log('Changes saved successfully');
    } catch (err) {
      console.error('Failed to update team assignments:', err);
      setError('Failed to update team assignments');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchGameData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching game data...');

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          venues (
            name
          ),
          game_registrations (
            *,
            player:players (
              *
            )
          ),
          balanced_team_assignments (
            *
          )
        `)
        .eq('id', game!.id)
        .single();

      if (gameError) {
        console.error('Error fetching game:', gameError);
        setError('Failed to load game data');
        return;
      }

      console.log('Game data fetched:', gameData);
      
      // Update game state without page refresh
      setGame(prevGame => ({
        ...prevGame,
        ...gameData
      }));
      
      // Set initial assignments from team_assignments if they exist
      if (gameData?.balanced_team_assignments?.[0]?.team_assignments?.teams) {
        console.log('Setting assignments from balanced teams');
        setAssignments(gameData.balanced_team_assignments[0].team_assignments.teams);
      } else {
        // Initialize assignments from registrations if no team assignments exist
        console.log('Setting assignments from registrations');
        const registeredPlayers = gameData?.game_registrations
          ?.filter(reg => reg.status === 'REGISTERED')
          ?.map(reg => ({
            player_id: reg.player.id,
            friendly_name: reg.player.friendly_name,
            attack_rating: reg.player.attack_rating,
            defense_rating: reg.player.defense_rating,
            team: null
          })) || [];
        setAssignments(registeredPlayers);
      }
    } catch (error) {
      console.error('Error in fetchGameData:', error);
      setError('An error occurred while loading the game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminDropout = async (playerId: string) => {
    try {
      if (!game) {
        console.error('No game data available');
        toast.error('No game data available');
        return;
      }

      setIsProcessingDropout(true);
      console.log('Starting dropout process for player:', playerId);

      const result = await showDialog({
        title: 'Confirm Player Dropout',
        message: 'Do you want to apply the same-day dropout penalty to this player?',
        confirmText: 'Yes, Apply Penalty',
        cancelText: 'No Penalty',
        type: 'warning'
      });
      
      if (result === null) {
        console.log('User cancelled dropout dialog');
        setIsProcessingDropout(false);
        return;
      }

      console.log('User made choice for dropout, proceeding with penalty:', result);
      
      if (result) {
        console.log('Adding penalty for player:', playerId);
        // Add penalty
        const { error: penaltyError } = await supabase
          .from('player_penalties')
          .insert({
            player_id: playerId,
            game_id: game.id,
            penalty_type: 'SAME_DAY_DROPOUT'
          });

        if (penaltyError) {
          console.error('Failed to add penalty:', penaltyError);
          toast.error('Failed to add dropout penalty');
          setIsProcessingDropout(false);
          return;
        }
        
        console.log('Added penalty');
        toast.success('Dropout penalty applied');
      }
      
      console.log('Updating game registration for player:', playerId);
      // Update game registration status
      const { error: registrationError } = await supabase
        .from('game_registrations')
        .update({ status: 'DROPPED_OUT' })
        .eq('player_id', playerId)
        .eq('game_id', game.id);

      if (registrationError) {
        console.error('Failed to update registration:', registrationError);
        toast.error('Failed to update registration');
        setIsProcessingDropout(false);
        return;
      }

      // Remove player from team assignments
      const updatedAssignments = assignments.filter(player => player.player_id !== playerId);
      setAssignments(updatedAssignments);

      console.log('Updating team assignments');
      // Update balanced_team_assignments
      const teamAssignmentsData = {
        teams: updatedAssignments.filter(p => p.team !== null).map(player => ({
          player_id: player.player_id,
          friendly_name: player.friendly_name,
          attack_rating: player.attack_rating,
          defense_rating: player.defense_rating,
          team: player.team
        }))
      };

      const { error: teamError } = await supabase
        .from('balanced_team_assignments')
        .update({
          team_assignments: teamAssignmentsData,
          attack_differential: calculateTeamDifferential(updatedAssignments, 'attack_rating'),
          defense_differential: calculateTeamDifferential(updatedAssignments, 'defense_rating'),
          total_differential: calculateTotalDifferential(updatedAssignments)
        })
        .eq('game_id', game.id);

      if (teamError) {
        console.error('Failed to update team assignments:', teamError);
        toast.error('Failed to update team assignments');
        setIsProcessingDropout(false);
        return;
      }
        
      console.log('Finding reserve players');
      // Find highest XP reserve player
      const { data: reserves, error: reserveError } = await supabase
        .from('game_registrations')
        .select(`
          player_id,
          players (
            id,
            friendly_name,
            xp
          )
        `)
        .eq('game_id', game.id)
        .eq('status', 'RESERVE')
        .order('xp', { ascending: false })
        .limit(1);
        
      if (reserveError) {
        console.error('Failed to fetch reserves:', reserveError);
      } else if (reserves?.[0]) {
        console.log('Notifying reserve player:', reserves[0]);
        // Notify reserve player
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            player_id: reserves[0].player_id,
            type: 'GAME_SPOT_AVAILABLE',
            message: `A spot has opened up in ${game.name}. Would you like to join?`,
            action_url: `/games/${game.id}/accept-spot`,
            expires_at: game.date
          });

        if (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }

      setIsProcessingDropout(false);
      toast.success('Player dropped out successfully');

    } catch (error) {
      console.error('Error in handleAdminDropout:', error);
      toast.error('An error occurred while processing dropout');
      setIsProcessingDropout(false);
    }
  };

  const calculateTeamStats = (players: TeamAssignment[]): TeamStats => {
    if (!players?.length) return { 
      avgAttack: 0, 
      avgDefense: 0, 
      totalAttack: 0, 
      totalDefense: 0 
    };
    
    const totalAttack = players.reduce((sum, p) => sum + Number(p.attack_rating || 0), 0);
    const totalDefense = players.reduce((sum, p) => sum + Number(p.defense_rating || 0), 0);
    
    return {
      totalAttack: Number(totalAttack.toFixed(2)),
      totalDefense: Number(totalDefense.toFixed(2)),
      avgAttack: Number((totalAttack / players.length).toFixed(2)),
      avgDefense: Number((totalDefense / players.length).toFixed(2))
    };
  };

  const calculateTeamDifferential = (players: TeamAssignment[], ratingType: 'attack_rating' | 'defense_rating') => {
    const blueTeam = players.filter(p => p.team === 'blue');
    const orangeTeam = players.filter(p => p.team === 'orange');
    
    const blueTotal = blueTeam.reduce((sum, p) => sum + Number(p[ratingType] || 0), 0);
    const orangeTotal = orangeTeam.reduce((sum, p) => sum + Number(p[ratingType] || 0), 0);
    
    return Number((blueTotal - orangeTotal).toFixed(2));
  };

  const calculateTotalDifferential = (players: TeamAssignment[]) => {
    const blueTeam = players.filter(p => p.team === 'blue');
    const orangeTeam = players.filter(p => p.team === 'orange');
    
    const blueAttack = blueTeam.reduce((sum, p) => sum + Number(p.attack_rating || 0), 0);
    const blueDefense = blueTeam.reduce((sum, p) => sum + Number(p.defense_rating || 0), 0);
    const orangeAttack = orangeTeam.reduce((sum, p) => sum + Number(p.attack_rating || 0), 0);
    const orangeDefense = orangeTeam.reduce((sum, p) => sum + Number(p.defense_rating || 0), 0);
    
    return Number((blueAttack - orangeAttack + blueDefense - orangeDefense).toFixed(2));
  };

  const findBalanceImprovements = (players: TeamAssignment[]) => {
    const blueTeam = players.filter(p => p.team === 'blue');
    const orangeTeam = players.filter(p => p.team === 'orange');
    const currentAttackDiff = Math.abs(calculateTeamDifferential(players, 'attack_rating'));
    const currentDefenseDiff = Math.abs(calculateTeamDifferential(players, 'defense_rating'));
    const currentTotalDiff = Math.abs(calculateTotalDifferential(players));

    let possibleSwaps: PlayerSwapSuggestion[] = [];

    // Try all possible swaps between blue and orange teams
    blueTeam.forEach(bluePlayer => {
      orangeTeam.forEach(orangePlayer => {
        // Create a test array with the swap
        const testPlayers = players.map(p => {
          if (p.player_id === bluePlayer.player_id) return { ...p, team: 'orange' };
          if (p.player_id === orangePlayer.player_id) return { ...p, team: 'blue' };
          return p;
        });

        const newAttackDiff = Math.abs(calculateTeamDifferential(testPlayers, 'attack_rating'));
        const newDefenseDiff = Math.abs(calculateTeamDifferential(testPlayers, 'defense_rating'));
        const newTotalDiff = Math.abs(calculateTotalDifferential(testPlayers));

        // If this swap improves the total balance
        if (newTotalDiff < currentTotalDiff) {
          possibleSwaps.push({
            bluePlayer,
            orangePlayer,
            attackDiffImprovement: currentAttackDiff - newAttackDiff,
            defenseDiffImprovement: currentDefenseDiff - newDefenseDiff,
            totalDiffImprovement: currentTotalDiff - newTotalDiff
          });
        }
      });
    });

    // Sort by total improvement
    possibleSwaps.sort((a, b) => b.totalDiffImprovement - a.totalDiffImprovement);
    return possibleSwaps.slice(0, 3); // Return top 3 suggestions
  };

  useEffect(() => {
    if (assignments.length > 0) {
      const newSuggestions = findBalanceImprovements(assignments);
      setSuggestions(newSuggestions);
    }
  }, [assignments]);

  const applySwapSuggestion = (suggestion: PlayerSwapSuggestion) => {
    const updatedAssignments = assignments.map(p => {
      if (p.player_id === suggestion.bluePlayer.player_id) return { ...p, team: 'orange' };
      if (p.player_id === suggestion.orangePlayer.player_id) return { ...p, team: 'blue' };
      return p;
    });
    setAssignments(updatedAssignments);
    setHasUnsavedChanges(true);
    setSelectedSuggestion(null);
  };

  const regenerateTeams = () => {
    // Get all non-reserve players
    const activePlayers = assignments.filter(p => p.team !== null);
    const reservePlayers = assignments.filter(p => p.team === null);
    
    // Sort players by total rating (attack + defense) in descending order
    const sortedPlayers = [...activePlayers].sort((a, b) => 
      ((b.attack_rating || 0) + (b.defense_rating || 0)) - 
      ((a.attack_rating || 0) + (a.defense_rating || 0))
    );

    const blueTeam: TeamAssignment[] = [];
    const orangeTeam: TeamAssignment[] = [];

    // Helper function to calculate team total rating
    const getTeamTotal = (team: TeamAssignment[]) => 
      team.reduce((sum, p) => sum + (p.attack_rating || 0) + (p.defense_rating || 0), 0);

    // Distribute players using a greedy algorithm
    sortedPlayers.forEach((player) => {
      const blueTotal = getTeamTotal(blueTeam);
      const orangeTotal = getTeamTotal(orangeTeam);

      if (blueTotal <= orangeTotal) {
        blueTeam.push({ ...player, team: 'blue' });
      } else {
        orangeTeam.push({ ...player, team: 'orange' });
      }
    });

    // Combine all players back together
    const newAssignments = [
      ...blueTeam,
      ...orangeTeam,
      ...reservePlayers
    ];

    setAssignments(newAssignments);
    setHasUnsavedChanges(true);
  };

  const TeamList: React.FC<{ 
    players: TeamAssignment[], 
    droppableId: string,
    title: string,
    stats?: TeamStats
  }> = ({ players, droppableId, title, stats }) => {
    console.log(`Rendering ${title} with players:`, players);
    console.log(`Stats for ${title}:`, stats);
    
    return (
      <div className="flex-1">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {stats && (
          <div className="stats stats-vertical shadow mb-4">
            <div className="stat">
              <div className="stat-title">Total Attack</div>
              <div className="stat-value">{stats.totalAttack}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Total Defense</div>
              <div className="stat-value">{stats.totalDefense}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Average Attack</div>
              <div className="stat-value">{stats.avgAttack}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Average Defense</div>
              <div className="stat-value">{stats.avgDefense}</div>
            </div>
          </div>
        )}
        <Droppable droppableId={droppableId}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="min-h-[200px] p-4 bg-base-200 rounded-lg"
            >
              {players.map((player, index) => (
                <Draggable 
                  key={player.player_id}
                  draggableId={player.player_id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="p-4 mb-2 bg-base-100 rounded shadow-sm cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="font-medium">{player.friendly_name}</div>
                      <div className="text-sm text-base-content/70">
                        Attack: {player.attack_rating} | Defense: {player.defense_rating}
                      </div>
                      {game && (
                        <button
                          className="btn btn-sm btn-error mt-2"
                          onClick={() => handleAdminDropout(player.player_id)}
                        >
                          Admin Dropout
                        </button>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  const GameCard: React.FC<{ game: Game }> = ({ game }) => {
    console.log('Rendering GameCard with assignments:', assignments);
    const blueTeam = assignments.filter(p => p.team === 'blue');
    const orangeTeam = assignments.filter(p => p.team === 'orange');
    const reservePlayers = assignments.filter(p => p.team === null);

    console.log('Teams:', { blueTeam, orangeTeam, reservePlayers });

    const blueStats = calculateTeamStats(blueTeam);
    const orangeStats = calculateTeamStats(orangeTeam);

    return (
      <div className="card bg-base-100 shadow-xl mb-4">
        <div className="card-body">
          <h2 className="card-title">
            {format(new Date(game.date), 'EEEE do MMMM')} - {game.venues.name}
          </h2>
          
          {suggestions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Suggested Improvements</h3>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="card bg-base-200 cursor-pointer hover:bg-base-300 transition-colors"
                    onMouseEnter={() => setSelectedSuggestion(suggestion)}
                    onMouseLeave={() => setSelectedSuggestion(null)}
                    onClick={() => applySwapSuggestion(suggestion)}
                  >
                    <div className="card-body p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p>Swap <span className="font-semibold text-blue-500">{suggestion.bluePlayer.friendly_name}</span> with 
                             <span className="font-semibold text-orange-500"> {suggestion.orangePlayer.friendly_name}</span></p>
                          <p className="text-sm opacity-70">
                            Attack Balance: {suggestion.attackDiffImprovement > 0 ? '+' : ''}{suggestion.attackDiffImprovement.toFixed(1)} | 
                            Defense Balance: {suggestion.defenseDiffImprovement > 0 ? '+' : ''}{suggestion.defenseDiffImprovement.toFixed(1)}
                          </p>
                        </div>
                        <button className="btn btn-sm">Apply</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TeamList
              players={blueTeam}
              droppableId="blue"
              title="Blue Team"
              stats={blueStats}
            />
            
            <TeamList
              players={orangeTeam}
              droppableId="orange"
              title="Orange Team"
              stats={orangeStats}
            />
            
            <TeamList
              players={reservePlayers}
              droppableId="reserve"
              title="Reserve Players"
            />
          </div>
        </div>
      </div>
    );
  };

  const handleGameUpdate = async () => {
    await fetchGameData();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <ToastContainer position="top-right" autoClose={3000} />
      {isProcessingDropout ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-lg font-semibold">Processing dropout...</p>
          </div>
        </div>
      ) : isLoading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Team Balancing</h1>
              <p className="text-sm text-gray-500">
                {game?.date ? format(new Date(game.date), 'EEEE, MMMM do yyyy') : 'Loading...'}
              </p>
            </div>
            <button
              className={`btn ${
                hasUnsavedChanges ? 'btn-primary' : 'btn-disabled'
              } ${isSaving ? 'loading' : ''}`}
              onClick={handleSaveChanges}
              disabled={!hasUnsavedChanges || isSaving}
            >
              {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
            </button>
          </div>
          <GameDetails 
            game={game!} 
            isRegistrationClosed={false}
            isUserRegistered={false}
            handleRegistration={async () => {}}
            handlePlayerSelection={async () => ({ selectedPlayers: [], reservePlayers: [] })}
            handleGameUpdate={handleGameUpdate}
          />
          <GameCard key={`${game?.id}-${lastSaveTime}`} game={game!} />
        </DragDropContext>
      )}
    </div>
  );
};

export default TeamBalancingOverview;
