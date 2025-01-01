import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { LoadingSpinner } from '../LoadingSpinner';
import { SelectedPlayer } from '../../types/game';
import { ViewToggle } from './views/ViewToggle';
import { PlayerListView } from './views/PlayerListView';
import { PlayerCardView } from './views/PlayerCardView';
import { calculatePlayerXP as calculateXP } from '../../utils/xpCalculations';
import { calculateRarity } from '../../utils/rarityCalculations';

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

/**
 * TeamSelectionResults component displays the results of team selection
 * with toggleable list/card views and alphabetically sorted players
 */
export const TeamSelectionResults: React.FC<TeamSelectionResultsProps> = ({ gameId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<GameSelection | null>(null);
  const [view, setView] = useState<'list' | 'card'>('card');

  useEffect(() => {
    const fetchSelectionAndPlayers = async () => {
      try {
        setIsLoading(true);
        
        // Try to get balanced teams from database
        const { data: balancedTeams, error: balanceError } = await supabase
          .from('balanced_team_assignments')
          .select('*')
          .eq('game_id', gameId)
          .single();

        // Get latest sequence number
        const { data: latestSequenceData } = await supabase
          .from('games')
          .select('sequence_number')
          .order('sequence_number', { ascending: false })
          .limit(1);

        const latestSequence = Number(latestSequenceData?.[0]?.sequence_number || 0);

        // Get all game registrations with their sequence numbers
        const { data: gameRegs, error: gameRegsError } = await supabase
          .from('game_registrations')
          .select(`
            player_id,
            team,
            games!inner (
              outcome,
              sequence_number
            )
          `)
          .order('games(sequence_number)', { ascending: false });

        if (gameRegsError) throw gameRegsError;

        // Group sequences by player
        const playerSequences = gameRegs.reduce((acc, reg) => {
          if (!reg.games?.sequence_number) return acc;
          
          const playerId = reg.player_id;
          if (!acc[playerId]) {
            acc[playerId] = {
              sequences: [],
              wins: 0,
              total: 0
            };
          }
          
          // Add sequence number if not already present
          const sequence = Number(reg.games.sequence_number);
          if (!acc[playerId].sequences.includes(sequence)) {
            acc[playerId].sequences.push(sequence);
          }
          
          // Calculate wins
          if (reg.games.outcome && reg.team) {
            const team = reg.team.toLowerCase();
            const isWin = (team === 'blue' && reg.games.outcome === 'blue_win') ||
                         (team === 'orange' && reg.games.outcome === 'orange_win');
            
            if (isWin) acc[playerId].wins++;
            acc[playerId].total++;
          }
          
          return acc;
        }, {} as Record<string, { sequences: number[], wins: number, total: number }>);

        // Get all registrations regardless of balanced teams status
        const { data: registrations, error: registrationError } = await supabase
          .from('game_registrations')
          .select(`
            player_id,
            status,
            team,
            players!game_registrations_player_id_fkey (
              id,
              friendly_name,
              caps,
              active_bonuses,
              active_penalties,
              win_rate,
              current_streak,
              avatar_svg,
              attack_rating,
              defense_rating
            )
          `)
          .eq('game_id', gameId);

        if (registrationError) throw registrationError;

        if (!registrations || registrations.length === 0) {
          setError('No players found for this game');
          return;
        }

        // Calculate XP for all players
        const allPlayersXP = registrations.map(r => {
          const playerData = playerSequences[r.player_id] || { sequences: [], wins: 0, total: 0 };
          return calculateXP({
            caps: r.players.caps || 0,
            activeBonuses: r.players.active_bonuses || 0,
            activePenalties: r.players.active_penalties || 0,
            currentStreak: r.players.current_streak || 0,
            gameSequences: playerData.sequences,
            latestSequence
          });
        });

        // Process selected players
        let selectedPlayers = registrations
          .filter(r => r.status === 'selected')
          .map(r => {
            const playerData = playerSequences[r.player_id] || { sequences: [], wins: 0, total: 0 };
            const playerXP = calculateXP({
              caps: r.players.caps || 0,
              activeBonuses: r.players.active_bonuses || 0,
              activePenalties: r.players.active_penalties || 0,
              currentStreak: r.players.current_streak || 0,
              gameSequences: playerData.sequences,
              latestSequence
            });

            // If we have balanced teams from database, use those assignments
            let team = r.team;
            if (balancedTeams?.team_assignments?.teams) {
              const teamAssignment = balancedTeams.team_assignments.teams.find(
                t => t.player_id === r.player_id
              );
              if (teamAssignment) {
                team = teamAssignment.team;
              }
            }
            
            return {
              id: r.players.id,
              friendly_name: r.players.friendly_name,
              team,
              stats: {
                caps: r.players.caps || 0,
                activeBonuses: r.players.active_bonuses || 0,
                activePenalties: r.players.active_penalties || 0,
                currentStreak: r.players.current_streak || 0,
                gameSequences: playerData.sequences,
                latestSequence
              },
              win_rate: r.players.win_rate || 0,
              max_streak: r.players.current_streak || 0,
              avatar_svg: r.players.avatar_svg,
              xp: playerXP,
              rarity: calculateRarity(playerXP, allPlayersXP),
              attack_rating: r.players.attack_rating || 0,
              defense_rating: r.players.defense_rating || 0
            };
          });

        // Process reserve players
        const reservePlayers = registrations
          .filter(r => r.status === 'reserve')
          .map(r => {
            const playerData = playerSequences[r.player_id] || { sequences: [], wins: 0, total: 0 };
            const playerXP = calculateXP({
              caps: r.players.caps || 0,
              activeBonuses: r.players.active_bonuses || 0,
              activePenalties: r.players.active_penalties || 0,
              currentStreak: r.players.current_streak || 0,
              gameSequences: playerData.sequences,
              latestSequence
            });
            
            return {
              id: r.players.id,
              friendly_name: r.players.friendly_name,
              stats: {
                caps: r.players.caps || 0,
                activeBonuses: r.players.active_bonuses || 0,
                activePenalties: r.players.active_penalties || 0,
                currentStreak: r.players.current_streak || 0,
                gameSequences: playerData.sequences,
                latestSequence
              },
              win_rate: r.players.win_rate || 0,
              max_streak: r.players.current_streak || 0,
              avatar_svg: r.players.avatar_svg,
              xp: playerXP,
              rarity: calculateRarity(playerXP, allPlayersXP),
              attack_rating: r.players.attack_rating || 0,
              defense_rating: r.players.defense_rating || 0
            };
          });

        setSelection({
          id: balancedTeams?.id || gameId,
          game_id: gameId,
          created_at: balancedTeams?.created_at || new Date().toISOString(),
          selected_players: selectedPlayers,
          reserve_players: reservePlayers,
          selection_metadata: balancedTeams?.selection_metadata || {
            startTime: '',
            endTime: '',
            meritSlots: selectedPlayers.length,
            randomSlots: 0,
            selectionNotes: []
          }
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSelectionAndPlayers();
  }, [gameId]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-error">Error: {error}</div>;
  if (!selection) return <div>No selection data found</div>;

  return (
    <div className="space-y-8 p-4">
      <ViewToggle view={view} onViewChange={setView} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {view === 'list' ? (
          <>
            <PlayerListView 
              players={selection.selected_players.filter(p => p.team === 'blue')}
              title="Blue Team"
            />
            <PlayerListView 
              players={selection.selected_players.filter(p => p.team === 'orange')}
              title="Orange Team"
            />
          </>
        ) : (
          <>
            <PlayerCardView 
              players={selection.selected_players.filter(p => p.team === 'blue')}
              title="Blue Team"
            />
            <PlayerCardView 
              players={selection.selected_players.filter(p => p.team === 'orange')}
              title="Orange Team"
            />
          </>
        )}
      </div>

      {selection.reserve_players.length > 0 && (
        <div className="mt-8">
          {view === 'list' ? (
            <PlayerListView 
              players={selection.reserve_players}
              title="Reserve Players"
            />
          ) : (
            <PlayerCardView 
              players={selection.reserve_players}
              title="Reserve Players"
            />
          )}
        </div>
      )}
    </div>
  );
};
