import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { calculateRarity } from '../../utils/rarityCalculations';
import { supabase } from '../../utils/supabase';
import { ExtendedPlayerData } from '../../types/playerSelection';
import PlayerCard from '../PlayerCard';
import { LoadingSpinner } from '../LoadingSpinner';
import { ViewToggle } from './views/ViewToggle';
import { FaUsers } from 'react-icons/fa';
import { useGlobalXP } from '../../hooks/useGlobalXP';

interface TeamSelectionResultsProps {
  gameId: string;
}

interface GameSelection {
  id: string;
  game_id: string;
  created_at: string;
  selected_players: ExtendedPlayerData[];
  reserve_players: ExtendedPlayerData[];
  selection_metadata: {
    startTime: string;
    endTime: string;
    meritSlots: number;
    randomSlots: number;
    selectionNotes: string[];
  };
}

interface TeamListViewProps {
  title: string;
  players: ExtendedPlayerData[];
  color: string;
}

const TeamListView: React.FC<TeamListViewProps> = ({ title, players, color }) => {
  return (
    <div className={`mb-8 border-2 border-${color}-500 rounded-lg p-6`}>
      <h3 className={`text-xl font-semibold mb-4 text-${color}-500 flex items-center gap-2`}>
        <FaUsers />
        {title}
        <span className="text-base font-normal">({players.length} players)</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {players
          .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name))
          .map((player) => (
            <div 
              key={player.id} 
              className={`text-lg font-medium p-2 rounded border border-${color}-200 bg-${color}-50`}
            >
              {player.friendly_name}
            </div>
          ))}
      </div>
    </div>
  );
};

export const TeamSelectionResults: React.FC<TeamSelectionResultsProps> = ({ gameId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<GameSelection | null>(null);
  const [playerStats, setPlayerStats] = useState<Record<string, { xp: number }>>({});
  const [view, setView] = useState<'list' | 'card'>('card');
  const [showBlueTeam, setShowBlueTeam] = useState(true);
  const [showOrangeTeam, setShowOrangeTeam] = useState(true);
  const [showReserves, setShowReserves] = useState(true);

  const { xpValues: globalXpValues, loading: globalXpLoading, error: globalXpError } = useGlobalXP();

  useEffect(() => {
    const fetchSelectionAndPlayers = async () => {
      try {
        setLoading(true);
        
        // Try to get balanced teams from database
        const { data: balancedTeams, error: balanceError } = await supabase
          .from('balanced_team_assignments')
          .select('*')
          .eq('game_id', gameId)
          .single();

        console.log('Balanced Teams Data:', balancedTeams);

        // Get all registrations with selection method
        const { data: registrations, error: registrationError } = await supabase
          .from('game_registrations')
          .select(`
            player_id,
            status,
            team,
            selection_method,
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

        if (registrationError) {
          console.error('Registration Error:', registrationError);
          throw registrationError;
        }

        if (!registrations || registrations.length === 0) {
          setError('No players found for this game');
          return;
        }

        console.log('Registrations with selection method:', registrations);

        // Get latest historical sequence number
        const { data: latestSequenceData } = await supabase
          .from('games')
          .select('sequence_number')
          .eq('is_historical', true)
          .order('sequence_number', { ascending: false })
          .limit(1);

        const latestSequence = Number(latestSequenceData?.[0]?.sequence_number || 0);

        // Get all historical game registrations with their sequence numbers
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
          .eq('games.is_historical', true)
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

        // Get player stats for all selected players
        const playerIds = registrations.map(reg => reg.players.id);
        const { data: statsData, error: statsError } = await supabase
          .from('player_stats')
          .select('id, xp')
          .in('id', playerIds);

        if (statsError) throw statsError;

        // Transform into a lookup object
        const statsLookup = statsData.reduce((acc, player) => {
          acc[player.id] = { xp: player.xp || 0 };
          return acc;
        }, {} as Record<string, { xp: number }>);

        setPlayerStats(statsLookup);

        // Process selected players
        let selectedPlayers = registrations
          .filter(r => r.status === 'selected')
          .map(r => {
            const playerData = playerSequences[r.player_id] || { sequences: [], wins: 0, total: 0 };
            const playerXP = statsLookup[r.players.id]?.xp || 0;

            // If we have balanced teams from database, use those assignments
            let team = r.team;
            const isRandomlySelected = r.selection_method === 'random';
            
            if (balancedTeams?.team_assignments?.teams) {
              const teamAssignment = balancedTeams.team_assignments.teams.find(
                t => t.player_id === r.player_id
              );
              if (teamAssignment) {
                team = teamAssignment.team;
              }
            }
            
            console.log('Player:', r.players.friendly_name, 'Random:', isRandomlySelected);
            
            return {
              id: r.players.id,
              friendly_name: r.players.friendly_name,
              team,
              isRandomlySelected,
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
              rarity: calculateRarity(playerXP, Object.values(statsLookup).map(stats => stats.xp)),
              attack_rating: r.players.attack_rating || 0,
              defense_rating: r.players.defense_rating || 0
            };
          });

        // Process reserve players
        const reservePlayers = registrations
          .filter(r => r.status === 'reserve')
          .map(r => {
            const playerData = playerSequences[r.player_id] || { sequences: [], wins: 0, total: 0 };
            const playerXP = statsLookup[r.players.id]?.xp || 0;
            
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
              rarity: calculateRarity(playerXP, Object.values(statsLookup).map(stats => stats.xp)),
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
        setLoading(false);
      }
    };

    fetchSelectionAndPlayers();
  }, [gameId]);

  if (loading || globalXpLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error || globalXpError) {
    return (
      <div className="text-center text-error p-4">
        <p>{error || globalXpError}</p>
      </div>
    );
  }
  if (!selection) return <div>No selection data found</div>;

  // Group players by team
  const blueTeam = selection.selected_players.filter(p => p.team === 'blue');
  const orangeTeam = selection.selected_players.filter(p => p.team === 'orange');

  return (
    <div className="space-y-8 p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Team Selection Results</h2>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {view === 'list' ? (
        // List View
        <div className="space-y-8 max-w-5xl mx-auto">
          <TeamListView
            title="Blue Team"
            players={blueTeam}
            color="blue"
          />
          <TeamListView
            title="Orange Team"
            players={orangeTeam}
            color="orange"
          />
        </div>
      ) : (
        // Card View
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Blue Team */}
          <div className="border-2 border-blue-500 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-500 flex items-center gap-2">
              <FaUsers />
              Blue Team
              <span className="text-base font-normal">({blueTeam.length} players)</span>
            </h3>
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-3 gap-6 justify-items-center sm:justify-items-stretch"
              layout
            >
              {blueTeam
                .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name))
                .map((player) => {
                  const playerXP = playerStats[player.id]?.xp || 0;
                  const rarity = calculateRarity(playerXP, globalXpValues);

                  return (
                    <motion.div
                      key={player.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PlayerCard
                        key={player.id}
                        id={player.id}
                        friendlyName={player.friendly_name}
                        xp={playerXP}
                        caps={player.stats.caps}
                        activeBonuses={player.stats.activeBonuses}
                        activePenalties={player.stats.activePenalties}
                        winRate={player.win_rate}
                        currentStreak={player.stats.currentStreak}
                        maxStreak={player.max_streak}
                        rarity={rarity}
                        avatarSvg={player.avatar_svg}
                        isRandomlySelected={player.isRandomlySelected}
                        gameSequences={player.stats.gameSequences}
                      />
                    </motion.div>
                  );
                })}
            </motion.div>
          </div>

          {/* Orange Team */}
          <div className="border-2 border-orange-500 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-orange-500 flex items-center gap-2">
              <FaUsers />
              Orange Team
              <span className="text-base font-normal">({orangeTeam.length} players)</span>
            </h3>
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-3 gap-6 justify-items-center sm:justify-items-stretch"
              layout
            >
              {orangeTeam
                .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name))
                .map((player) => {
                  const playerXP = playerStats[player.id]?.xp || 0;
                  const rarity = calculateRarity(playerXP, globalXpValues);

                  return (
                    <motion.div
                      key={player.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PlayerCard
                        key={player.id}
                        id={player.id}
                        friendlyName={player.friendly_name}
                        xp={playerXP}
                        caps={player.stats.caps}
                        activeBonuses={player.stats.activeBonuses}
                        activePenalties={player.stats.activePenalties}
                        winRate={player.win_rate}
                        currentStreak={player.stats.currentStreak}
                        maxStreak={player.max_streak}
                        rarity={rarity}
                        avatarSvg={player.avatar_svg}
                        isRandomlySelected={player.isRandomlySelected}
                        gameSequences={player.stats.gameSequences}
                      />
                    </motion.div>
                  );
                })}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};
