import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  const [view, setView] = useState<'list' | 'card'>('card');
  const [showBlueTeam, setShowBlueTeam] = useState(true);
  const [showOrangeTeam, setShowOrangeTeam] = useState(true);
  const [showReserves, setShowReserves] = useState(true);

  const { xpValues: globalXpValues, loading: globalXpLoading, error: globalXpError } = useGlobalXP();

  useEffect(() => {
    const fetchSelectionAndPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get win rates using the get_player_win_rates function
        const { data: winRatesData, error: winRatesError } = await supabase
          .rpc('get_player_win_rates');

        if (winRatesError) throw winRatesError;

        // Try to get balanced teams from database
        const { data: balancedTeamsData, error: balanceError } = await supabase
          .from('balanced_team_assignments')
          .select('*')
          .eq('game_id', gameId);

        if (balanceError) throw balanceError;

        // Get the first balanced team assignment if any exist
        const balancedTeams = balancedTeamsData?.[0];

        // Get all registrations with selection method and player data
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
              current_streak,
              max_streak,
              avatar_svg,
              whatsapp_group_member
            )
          `)
          .eq('game_id', gameId);

        if (registrationError) throw registrationError;

        // Create win rates map
        const winRatesMap = new Map(winRatesData?.map(wr => [wr.id, {
          wins: wr.wins,
          draws: wr.draws,
          losses: wr.losses,
          total_games: wr.total_games,
          win_rate: wr.win_rate
        }]) || []);

        // Get rarity data from player_xp
        const { data: xpData, error: xpError } = await supabase
          .from('player_xp')
          .select('player_id, rarity, xp')
          .in('player_id', registrations.map(r => r.player_id));

        if (xpError) throw xpError;

        // Create maps for rarity and xp
        const playerDataMap = xpData?.reduce((acc, data) => ({
          ...acc,
          [data.player_id]: {
            rarity: data.rarity,
            xp: data.xp
          }
        }), {} as Record<string, { rarity: string, xp: number }>);

        // Transform registrations into ExtendedPlayerData
        const transformedRegistrations = registrations.map(reg => {
          const player = reg.players;
          const playerData = playerDataMap[reg.player_id] || { rarity: 'Amateur', xp: 0 };
          const winRateData = winRatesMap.get(reg.player_id) || {
            wins: 0,
            draws: 0,
            losses: 0,
            total_games: 0,
            win_rate: 0
          };
          
          // Calculate streak bonus
          const streakModifier = (player.current_streak || 0) * 0.1;
          const bonusModifier = (player.active_bonuses || 0) * 0.1;
          const penaltyModifier = (player.active_penalties || 0) * -0.1;
          const totalModifier = streakModifier + bonusModifier + penaltyModifier;

          return {
            id: player.id,
            friendly_name: player.friendly_name,
            caps: player.caps || 0,
            active_bonuses: player.active_bonuses || 0,
            active_penalties: player.active_penalties || 0,
            current_streak: player.current_streak || 0,
            max_streak: player.max_streak || 0,
            xp: playerData.xp,
            rarity: playerData.rarity,
            avatar_svg: player.avatar_svg || '',
            team: reg.team,
            status: reg.status,
            selection_method: reg.selection_method,
            streakBonus: streakModifier,
            bonusModifier: bonusModifier,
            penaltyModifier: penaltyModifier,
            totalModifier: totalModifier,
            wins: winRateData.wins,
            draws: winRateData.draws,
            losses: winRateData.losses,
            totalGames: winRateData.total_games,
            winRate: winRateData.win_rate,
            whatsapp_group_member: player.whatsapp_group_member
          };
        });

        // Group players by team
        const blueTeam = transformedRegistrations.filter(p => p.team === 'blue');
        const orangeTeam = transformedRegistrations.filter(p => p.team === 'orange');
        const reserves = transformedRegistrations.filter(p => p.status === 'reserve');

        setSelection({
          id: balancedTeams?.id || '',
          game_id: gameId,
          created_at: balancedTeams?.created_at || new Date().toISOString(),
          selected_players: [...blueTeam, ...orangeTeam],
          reserve_players: reserves,
          selection_metadata: balancedTeams?.team_assignments?.stats || {
            startTime: '',
            endTime: '',
            meritSlots: 0,
            randomSlots: 0,
            selectionNotes: []
          }
        });

      } catch (error) {
        console.error('Error fetching selection and players:', error);
        setError('Failed to load team selection data');
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
                .map((player) => (
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
                      xp={player.xp}
                      caps={player.caps}
                      activeBonuses={player.active_bonuses}
                      activePenalties={player.active_penalties}
                      currentStreak={player.current_streak}
                      maxStreak={player.max_streak}
                      rarity={player.rarity}
                      avatarSvg={player.avatar_svg}
                      isRandomlySelected={player.selection_method === 'random'}
                      gameSequences={[]}
                      wins={player.wins}
                      draws={player.draws}
                      losses={player.losses}
                      totalGames={player.totalGames}
                      winRate={player.winRate}
                      whatsapp_group_member={player.whatsapp_group_member}
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
                      key={player.id}
                      id={player.id}
                      friendlyName={player.friendly_name}
                      xp={player.xp}
                      caps={player.caps}
                      activeBonuses={player.active_bonuses}
                      activePenalties={player.active_penalties}
                      currentStreak={player.current_streak}
                      maxStreak={player.max_streak}
                      rarity={player.rarity}
                      avatarSvg={player.avatar_svg}
                      isRandomlySelected={player.selection_method === 'random'}
                      gameSequences={[]}
                      wins={player.wins}
                      draws={player.draws}
                      losses={player.losses}
                      totalGames={player.totalGames}
                      winRate={player.winRate}
                      whatsapp_group_member={player.whatsapp_group_member}
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
