import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlayerCard } from '../player-card/PlayerCard';
import { supabase } from '../../utils/supabase';
import { ExtendedPlayerData } from '../../types/playerSelection';
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

const getPlayerWithRank = (player: ExtendedPlayerData) => {
  return {
    ...player,
    rank: playerStats[player.id]?.rank
  };
};

export const TeamSelectionResults: React.FC<TeamSelectionResultsProps> = ({ gameId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<GameSelection | null>(null);
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [playerStats, setPlayerStats] = useState<Record<string, any>>({});
  const { xpValues: globalXpValues, loading: globalXpLoading, error: globalXpError } = useGlobalXP();

  useEffect(() => {
    const fetchTeamSelection = async () => {
      try {
        setLoading(true);
        // First get the selected and reserve players through game_registrations
        const { data: registrations, error: registrationsError } = await supabase
          .from('game_registrations')
          .select(`
            id,
            game_id,
            status,
            team,
            players:player_id (
              id,
              friendly_name,
              avatar_svg,
              whatsapp_group_member
            )
          `)
          .eq('game_id', gameId);

        if (registrationsError) throw registrationsError;

        // Transform the data into the expected format
        const selectedPlayers = registrations
          ?.filter(reg => reg.status === 'selected')
          .map(reg => ({
            ...reg.players,
            team: reg.team
          })) || [];

        const reservePlayers = registrations
          ?.filter(reg => reg.status === 'reserve')
          .map(reg => ({
            ...reg.players,
            team: reg.team
          })) || [];

        // Get the game selection metadata
        const { data: selectionData, error: selectionError } = await supabase
          .from('game_selections')
          .select('*')
          .eq('game_id', gameId)
          .maybeSingle();

        // If there's a real error (not just no data found)
        if (selectionError && selectionError.code !== 'PGRST116') {
          console.error('Selection fetch error:', selectionError);
          throw selectionError;
        }

        // Initialize default selection state
        const defaultSelection = {
          id: gameId,
          game_id: gameId,
          created_at: new Date().toISOString(),
          selected_players: selectedPlayers,
          reserve_players: reservePlayers,
          selection_metadata: {
            startTime: '',
            endTime: '',
            meritSlots: 0,
            randomSlots: 0,
            selectionNotes: []
          }
        };

        // If no data found, use default selection
        if (!selectionData) {
          console.info('No selection data found for game:', gameId);
          setSelection(defaultSelection);
          return;
        }

        // If we have data, use it
        setSelection({
          ...defaultSelection,
          ...selectionData,
          selected_players: selectedPlayers,
          reserve_players: reservePlayers
        });
      } catch (err) {
        console.error('Error fetching team selection:', err);
        setError('Failed to load team selection');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamSelection();
  }, [gameId]);

  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        
        // Get player stats for all players
        const playerIds = [...(selection?.selected_players || []), ...(selection?.reserve_players || [])].map(player => player.id);
        
        // Get player stats and XP data
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select(`
            id,
            caps,
            current_streak,
            max_streak,
            bench_warmer_streak,
            active_bonuses,
            active_penalties,
            win_rate,
            unpaid_games,
            unpaid_games_modifier,
            player_xp (
              xp,
              rank,
              rarity
            )
          `)
          .in('id', playerIds);

        if (playerError) throw playerError;

        // Get registration streak data using friendly names
        const { data: regStreakData, error: regStreakError } = await supabase
          .from('player_current_registration_streak_bonus')
          .select('friendly_name, current_streak_length, bonus_applies');

        if (regStreakError) throw regStreakError;

        // Create a map of registration streak data for easy lookup by friendly name
        const regStreakMap = regStreakData?.reduce((acc: any, player: any) => ({
          ...acc,
          [player.friendly_name]: {
            registrationStreak: player.current_streak_length || 0,
            registrationStreakApplies: player.bonus_applies || false
          }
        }), {});

        // Get win rates and game stats
        const { data: winRateData, error: winRateError } = await supabase
          .rpc('get_player_win_rates')
          .in('id', playerIds);

        if (winRateError) throw winRateError;

        // Create a map of win rate data for easy lookup
        const winRateMap = winRateData.reduce((acc: any, player: any) => ({
          ...acc,
          [player.id]: {
            wins: player.wins,
            draws: player.draws,
            losses: player.losses,
            totalGames: player.total_games,
            winRate: player.win_rate
          }
        }), {});

        // Transform into record for easy lookup
        const stats = playerData?.reduce((acc, player) => {
          // Find the matching player in the selection to get friendly_name
          const selectedPlayer = [...(selection?.selected_players || []), ...(selection?.reserve_players || [])]
            .find(p => p.id === player.id);
          
          return {
            ...acc,
            [player.id]: {
              xp: player.player_xp?.xp || 0,
              rarity: player.player_xp?.rarity || 'Amateur',
              caps: player.caps || 0,
              activeBonuses: player.active_bonuses || 0,
              activePenalties: player.active_penalties || 0,
              currentStreak: player.current_streak || 0,
              maxStreak: player.max_streak || 0,
              benchWarmerStreak: player.bench_warmer_streak || 0,
              wins: winRateMap[player.id]?.wins || 0,
              draws: winRateMap[player.id]?.draws || 0,
              losses: winRateMap[player.id]?.losses || 0,
              totalGames: winRateMap[player.id]?.totalGames || 0,
              winRate: winRateMap[player.id]?.winRate || 0,
              rank: player.player_xp?.rank || undefined,
              unpaidGames: player.unpaid_games || 0,
              unpaidGamesModifier: player.unpaid_games_modifier || 0,
              registrationStreakBonus: regStreakMap[selectedPlayer?.friendly_name]?.registrationStreak || 0,
              registrationStreakBonusApplies: regStreakMap[selectedPlayer?.friendly_name]?.registrationStreakApplies || false
            }
          };
        }, {});

        setPlayerStats(stats);
      } catch (err) {
        console.error('Error fetching player stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (selection) fetchPlayerStats();
  }, [selection]);

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
                .map((player) => (
                  <motion.div
                    key={player.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PlayerCard
                      id={player.id}
                      friendlyName={player.friendly_name}
                      xp={playerStats[player.id]?.xp || 0}
                      caps={playerStats[player.id]?.caps || 0}
                      activeBonuses={playerStats[player.id]?.activeBonuses || 0}
                      activePenalties={playerStats[player.id]?.activePenalties || 0}
                      winRate={playerStats[player.id]?.winRate || 0}
                      wins={playerStats[player.id]?.wins || 0}
                      draws={playerStats[player.id]?.draws || 0}
                      losses={playerStats[player.id]?.losses || 0}
                      totalGames={playerStats[player.id]?.totalGames || 0}
                      currentStreak={playerStats[player.id]?.currentStreak || 0}
                      maxStreak={playerStats[player.id]?.maxStreak || 0}
                      benchWarmerStreak={playerStats[player.id]?.benchWarmerStreak || 0}
                      rarity={playerStats[player.id]?.rarity}
                      avatarSvg={player.avatar_svg}
                      whatsapp_group_member={player.whatsapp_group_member}
                      rank={playerStats[player.id]?.rank}
                      unpaidGames={playerStats[player.id]?.unpaidGames || 0}
                      unpaidGamesModifier={playerStats[player.id]?.unpaidGamesModifier || 0}
                      registrationStreakBonus={playerStats[player.id]?.registrationStreakBonus || 0}
                      registrationStreakBonusApplies={playerStats[player.id]?.registrationStreakBonusApplies}
                    />
                  </motion.div>
                ))}
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
                .map((player) => (
                  <motion.div
                    key={player.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PlayerCard
                      id={player.id}
                      friendlyName={player.friendly_name}
                      xp={playerStats[player.id]?.xp || 0}
                      caps={playerStats[player.id]?.caps || 0}
                      activeBonuses={playerStats[player.id]?.activeBonuses || 0}
                      activePenalties={playerStats[player.id]?.activePenalties || 0}
                      winRate={playerStats[player.id]?.winRate || 0}
                      wins={playerStats[player.id]?.wins || 0}
                      draws={playerStats[player.id]?.draws || 0}
                      losses={playerStats[player.id]?.losses || 0}
                      totalGames={playerStats[player.id]?.totalGames || 0}
                      currentStreak={playerStats[player.id]?.currentStreak || 0}
                      maxStreak={playerStats[player.id]?.maxStreak || 0}
                      benchWarmerStreak={playerStats[player.id]?.benchWarmerStreak || 0}
                      rarity={playerStats[player.id]?.rarity}
                      avatarSvg={player.avatar_svg}
                      whatsapp_group_member={player.whatsapp_group_member}
                      rank={playerStats[player.id]?.rank}
                      unpaidGames={playerStats[player.id]?.unpaidGames || 0}
                      unpaidGamesModifier={playerStats[player.id]?.unpaidGamesModifier || 0}
                      registrationStreakBonus={playerStats[player.id]?.registrationStreakBonus || 0}
                      registrationStreakBonusApplies={playerStats[player.id]?.registrationStreakBonusApplies}
                    />
                  </motion.div>
                ))}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};
