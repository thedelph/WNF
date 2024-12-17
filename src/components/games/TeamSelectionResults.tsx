import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { LoadingSpinner } from '../LoadingSpinner';
import { Player } from '../../types/game';
import PlayerCard from '../PlayerCard';
import { calculatePlayerXP as calculateXP } from '../../utils/xpCalculations';

interface SelectedPlayer {
  id: string;
  friendly_name: string;
  team?: 'blue' | 'orange';
  isRandomlySelected?: boolean;
  caps?: number;
  active_bonuses?: number;
  active_penalties?: number;
  win_rate?: number;
  current_streak?: number;
  max_streak?: number;
  avatar_svg?: string;
  xp?: number;
  rarity?: string;
}

interface GameSelection {
  id: string;
  game_id: string;
  created_at: string;
  selected_players: SelectedPlayer[];
  reserve_players: SelectedPlayer[];
  selection_metadata: {
    startTime: string;
    endTime: string;
    meritSlots: number;
    randomSlots: number;
    selectionNotes: string[];
  };
}

interface TeamSelectionResultsProps {
  gameId: string;
}

const calculateRarity = (playerXP: number, allPlayersXP: number[]) => {
  const sortedXP = [...allPlayersXP].sort((a, b) => b - a);
  const position = sortedXP.indexOf(playerXP);
  const totalPlayers = allPlayersXP.length;
  
  const thresholds = {
    legendary: Math.max(1, Math.ceil(totalPlayers * 0.02)),  // Top 2%
    epic: Math.max(2, Math.ceil(totalPlayers * 0.07)),       // Top 7%
    rare: Math.max(4, Math.ceil(totalPlayers * 0.20)),       // Top 20%
    uncommon: Math.max(8, Math.ceil(totalPlayers * 0.40))    // Top 40%
  };

  console.log('Rarity calculation:', {
    playerXP,
    position,
    totalPlayers,
    thresholds,
    allXPs: sortedXP
  });

  if (position < thresholds.legendary) return 'Legendary';
  if (position < thresholds.epic) return 'Epic';
  if (position < thresholds.rare) return 'Rare';
  if (position < thresholds.uncommon) return 'Uncommon';
  return 'Common';
};

export const TeamSelectionResults: React.FC<TeamSelectionResultsProps> = ({ gameId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<GameSelection | null>(null);

  useEffect(() => {
    const fetchSelectionAndPlayers = async () => {
      try {
        setIsLoading(true);
        
        console.log('Fetching balanced team assignments for game:', gameId);
        
        // Try to get balanced teams from database
        const { data: balancedTeams, error: balanceError } = await supabase
          .from('balanced_team_assignments')
          .select('*')
          .eq('game_id', gameId)
          .single();

        if (balanceError) {
          console.error('Error fetching balanced teams:', balanceError);
          // Continue with fetching game registrations even if there's an error
        }

        let selectedPlayers: SelectedPlayer[] = [];
        let reservePlayers: SelectedPlayer[] = [];

        if (!balancedTeams) {
          console.log('No balanced teams found, fetching game registrations');
          // If no balanced teams, fetch all game registrations
          const { data: registrations, error: registrationError } = await supabase
            .from('game_registrations')
            .select(`
              player_id,
              status,
              players!game_registrations_player_id_fkey (
                id,
                friendly_name,
                caps,
                active_bonuses,
                active_penalties,
                win_rate,
                current_streak,
                avatar_svg
              )
            `)
            .eq('game_id', gameId);

          if (registrationError) {
            console.error('Error fetching game registrations:', registrationError);
            throw registrationError;
          }

          if (registrations) {
            console.log('Game registrations fetched:', registrations.length);
            
            // Calculate XP for all players first
            const allPlayersXP = registrations.map(r => calculateXP({
              caps: r.players.caps || 0,
              activeBonuses: r.players.active_bonuses || 0,
              activePenalties: r.players.active_penalties || 0,
              currentStreak: r.players.current_streak || 0
            }));

            // Map confirmed players with XP and rarity
            selectedPlayers = registrations
              .filter(r => r.status === 'confirmed')
              .map(r => {
                const playerXP = calculateXP({
                  caps: r.players.caps || 0,
                  activeBonuses: r.players.active_bonuses || 0,
                  activePenalties: r.players.active_penalties || 0,
                  currentStreak: r.players.current_streak || 0
                });
                
                return {
                  id: r.players.id,
                  friendly_name: r.players.friendly_name,
                  team: Math.random() < 0.5 ? 'blue' : 'orange',
                  caps: r.players.caps || 0,
                  active_bonuses: r.players.active_bonuses || 0,
                  active_penalties: r.players.active_penalties || 0,
                  win_rate: r.players.win_rate || 0,
                  current_streak: r.players.current_streak || 0,
                  avatar_svg: r.players.avatar_svg,
                  xp: playerXP,
                  rarity: calculateRarity(playerXP, allPlayersXP)
                };
              });

            // Map reserve players with XP and rarity
            reservePlayers = registrations
              .filter(r => r.status === 'reserve')
              .map(r => {
                const playerXP = calculateXP({
                  caps: r.players.caps || 0,
                  activeBonuses: r.players.active_bonuses || 0,
                  activePenalties: r.players.active_penalties || 0,
                  currentStreak: r.players.current_streak || 0
                });
                
                return {
                  id: r.players.id,
                  friendly_name: r.players.friendly_name,
                  caps: r.players.caps || 0,
                  active_bonuses: r.players.active_bonuses || 0,
                  active_penalties: r.players.active_penalties || 0,
                  win_rate: r.players.win_rate || 0,
                  current_streak: r.players.current_streak || 0,
                  avatar_svg: r.players.avatar_svg,
                  xp: playerXP,
                  rarity: calculateRarity(playerXP, allPlayersXP)
                };
              });
          }
        } else {
          // Use balanced teams data
          console.log('Using balanced teams data:', balancedTeams);
          
          // Extract players from balanced teams data structure
          const { team_assignments } = balancedTeams;
          
          if (!team_assignments || !team_assignments.teams) {
            console.error('Invalid balanced teams data structure:', balancedTeams);
            throw new Error('Invalid balanced teams data structure');
          }

          // Get players assigned to teams
          selectedPlayers = team_assignments.teams.map(async player => {
            // First get the full player data from the database
            const { data: playerData, error: playerError } = await supabase
              .from('players')
              .select('*')
              .eq('id', player.player_id)
              .single();

            if (playerError) {
              console.error('Error fetching player data:', playerError);
              return {
                id: player.player_id,
                friendly_name: player.friendly_name,
                team: player.team,
                caps: 0,
                active_bonuses: 0,
                active_penalties: 0,
                win_rate: 0,
                current_streak: 0,
                avatar_svg: ''
              };
            }

            return {
              id: playerData.id,
              friendly_name: playerData.friendly_name,
              team: player.team,
              caps: playerData.caps || 0,
              active_bonuses: playerData.active_bonuses || 0,
              active_penalties: playerData.active_penalties || 0,
              win_rate: playerData.win_rate || 0,
              current_streak: playerData.current_streak || 0,
              avatar_svg: playerData.avatar_svg
            };
          });

          // Wait for all player data to be fetched
          selectedPlayers = await Promise.all(selectedPlayers);

          // Get all player IDs that are already in teams
          const assignedPlayerIds = new Set(selectedPlayers.map(p => p.id));

          // Fetch all registrations to get reserve players
          const { data: registrations, error: registrationError } = await supabase
            .from('game_registrations')
            .select(`
              player_id,
              status,
              players!game_registrations_player_id_fkey (
                id,
                friendly_name,
                caps,
                active_bonuses,
                active_penalties,
                win_rate,
                current_streak,
                avatar_svg
              )
            `)
            .eq('game_id', gameId);

          if (registrationError) {
            console.error('Error fetching registrations:', registrationError);
            throw registrationError;
          }

          // Filter out any players that are already in teams and get reserves
          reservePlayers = (registrations || [])
            .filter(r => r.status === 'reserve' && !assignedPlayerIds.has(r.players.id))
            .map(r => ({
              id: r.players.id,
              friendly_name: r.players.friendly_name,
              caps: r.players.caps || 0,
              active_bonuses: r.players.active_bonuses || 0,
              active_penalties: r.players.active_penalties || 0,
              win_rate: r.players.win_rate || 0,
              current_streak: r.players.current_streak || 0,
              avatar_svg: r.players.avatar_svg
            }));

          // Calculate XP and rarity for all players
          const allPlayers = [...selectedPlayers, ...reservePlayers];
          const allPlayersXP = allPlayers.map(p => calculateXP({
            caps: p.caps || 0,
            activeBonuses: p.active_bonuses || 0,
            activePenalties: p.active_penalties || 0,
            currentStreak: p.current_streak || 0
          }));

          console.log('All players XP:', allPlayersXP.sort((a, b) => b - a));

          // Update selected players with XP and rarity
          selectedPlayers = selectedPlayers.map(p => {
            const playerXP = calculateXP({
              caps: p.caps || 0,
              activeBonuses: p.active_bonuses || 0,
              activePenalties: p.active_penalties || 0,
              currentStreak: p.current_streak || 0
            });

            const rarity = calculateRarity(playerXP, allPlayersXP);

            console.log('Player stats:', {
              name: p.friendly_name,
              caps: p.caps,
              activeBonuses: p.active_bonuses,
              activePenalties: p.active_penalties,
              currentStreak: p.current_streak,
              calculatedXP: playerXP,
              rarity
            });

            return {
              ...p,
              xp: playerXP,
              rarity
            };
          });

          // Update reserve players with XP and rarity
          reservePlayers = reservePlayers.map(p => {
            const playerXP = calculateXP({
              caps: p.caps || 0,
              activeBonuses: p.active_bonuses || 0,
              activePenalties: p.active_penalties || 0,
              currentStreak: p.current_streak || 0
            });

            return {
              ...p,
              xp: playerXP,
              rarity: calculateRarity(playerXP, allPlayersXP)
            };
          });
        }

        console.log('Selected players:', selectedPlayers.length);
        console.log('Reserve players:', reservePlayers.length);

        if (!balancedTeams) {
          console.warn('No balanced team assignments found. Players have been randomly assigned to teams.');
        }

        // Transform the data to match our component's expected format
        const selection: GameSelection = {
          id: `${gameId}-selection`,
          game_id: gameId,
          created_at: new Date().toISOString(),
          selected_players: selectedPlayers,
          reserve_players: reservePlayers,
          selection_metadata: {
            endTime: new Date().toISOString(),
            startTime: new Date().toISOString(),
            meritSlots: selectedPlayers.length - 1,
            randomSlots: 1,
            selectionNotes: []
          }
        };

        console.log('Final selection data:', {
          blueTeam: selection.selected_players.filter(p => p.team === 'blue'),
          orangeTeam: selection.selected_players.filter(p => p.team === 'orange'),
          reserves: selection.reserve_players
        });

        setSelection(selection);
      } catch (error) {
        console.error('Error fetching selection:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (gameId) {
      fetchSelectionAndPlayers();
    } else {
      setError('No game ID provided');
      setIsLoading(false);
    }
  }, [gameId]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !selection) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded-lg border border-red-200">
        {error || 'No team selection found'}
      </div>
    );
  }

  // Get balanced teams
  const blueTeam = selection.selected_players.filter(p => p.team === 'blue');
  const orangeTeam = selection.selected_players.filter(p => p.team === 'orange');
  const unassignedPlayers = selection.selected_players.filter(p => !p.team);

  // Sort teams by total rating for display
  const sortByRating = (a: SelectedPlayer, b: SelectedPlayer) => 
    (b.win_rate || 0) - (a.win_rate || 0);
  
  blueTeam.sort(sortByRating);
  orangeTeam.sort(sortByRating);
  unassignedPlayers.sort(sortByRating);

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Team Assignments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blue Team */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-3 text-blue-800">Blue Team</h3>
          <div className="flex flex-wrap gap-4">
            {blueTeam.map(player => (
              <div key={player.id} className="inline-block border-2 border-blue-500 rounded-lg w-fit">
                <PlayerCard
                  id={player.id}
                  friendlyName={player.friendly_name}
                  caps={player.caps || 0}
                  xp={player.xp || 0}
                  rarity={player.rarity || 'Common'}
                  preferredPosition={''}
                  activeBonuses={player.active_bonuses || 0}
                  activePenalties={player.active_penalties || 0}
                  winRate={player.win_rate || 0}
                  currentStreak={player.current_streak || 0}
                  maxStreak={0}
                  avatarSvg={player.avatar_svg || ''}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Orange Team */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-3 text-orange-800">Orange Team</h3>
          <div className="flex flex-wrap gap-4">
            {orangeTeam.map(player => (
              <div key={player.id} className="inline-block border-2 border-orange-500 rounded-lg w-fit">
                <PlayerCard
                  id={player.id}
                  friendlyName={player.friendly_name}
                  caps={player.caps || 0}
                  xp={player.xp || 0}
                  rarity={player.rarity || 'Common'}
                  preferredPosition={''}
                  activeBonuses={player.active_bonuses || 0}
                  activePenalties={player.active_penalties || 0}
                  winRate={player.win_rate || 0}
                  currentStreak={player.current_streak || 0}
                  maxStreak={0}
                  avatarSvg={player.avatar_svg || ''}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reserve Players */}
      {selection.reserve_players.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-3">Reserve Players</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-wrap gap-4">
              {selection.reserve_players.map(player => (
                <div key={player.id} className="inline-block border-2 border-gray-300 rounded-lg w-fit">
                  <PlayerCard
                    id={player.id}
                    friendlyName={player.friendly_name}
                    caps={player.caps || 0}
                    xp={player.xp || 0}
                    rarity={player.rarity || 'Common'}
                    preferredPosition={''}
                    activeBonuses={player.active_bonuses || 0}
                    activePenalties={player.active_penalties || 0}
                    winRate={player.win_rate || 0}
                    currentStreak={player.current_streak || 0}
                    maxStreak={0}
                    avatarSvg={player.avatar_svg || ''}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
