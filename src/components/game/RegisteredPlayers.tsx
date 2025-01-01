import React from 'react';
import { FaUser } from 'react-icons/fa';
import { calculateRarity } from '../../utils/rarityCalculations';
import { calculatePlayerXP } from '../../utils/xpCalculations';
import PlayerCard from '../PlayerCard';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { supabase } from '../../utils/supabase';

interface GameRegistration {
  id: string;
  status: string;
  randomly_selected: boolean;
  player: {
    id: string;
    friendly_name: string;
    preferred_position: string;
    caps: number;
    active_bonuses: number;
    active_penalties: number;
    current_streak: number;
    win_rate: number;
    max_streak: number;
    avatar_svg: string;
  };
}

interface RegisteredPlayersProps {
  registrations: GameRegistration[];
}

export const RegisteredPlayers: React.FC<RegisteredPlayersProps> = ({ registrations }) => {
  const { allPlayersXP, loading } = usePlayerStats();
  const [latestSequence, setLatestSequence] = React.useState(0);
  const [playerGameData, setPlayerGameData] = React.useState<Record<string, { sequences: number[], wins: number, total: number }>>({});

  // Fetch latest sequence number and player sequences
  React.useEffect(() => {
    const fetchGameData = async () => {
      try {
        // Get latest sequence number
        const { data: latestGameData, error: latestGameError } = await supabase
          .from('games')
          .select('sequence_number')
          .order('sequence_number', { ascending: false })
          .limit(1)
          .single();

        if (latestGameError) throw latestGameError;
        const latestSeq = Number(latestGameData?.sequence_number || 0);
        setLatestSequence(latestSeq);

        // Get all game registrations with sequences
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
        const gameData = gameRegs.reduce((acc, reg) => {
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
          
          // Sort sequences in descending order (most recent first)
          acc[playerId].sequences.sort((a, b) => b - a);

          // Calculate wins if outcome exists
          if (reg.games.outcome && reg.team) {
            const team = reg.team.toLowerCase();
            const isWin = (team === 'blue' && reg.games.outcome === 'blue_win') ||
                         (team === 'orange' && reg.games.outcome === 'orange_win');
            
            if (isWin) acc[playerId].wins++;
            acc[playerId].total++;
          }
          
          return acc;
        }, {} as Record<string, { sequences: number[], wins: number, total: number }>);

        setPlayerGameData(gameData);
      } catch (error) {
        console.error('Error fetching game data:', error);
      }
    };

    fetchGameData();
  }, []);

  // Filter out any invalid registrations and sort by XP
  const validRegistrations = (registrations || []).filter(reg => {
    const isValid = reg && reg.player && reg.id;
    return isValid;
  });

  const sortedRegistrations = [...validRegistrations].sort((a, b) => {
    const aStats = {
      caps: a.player.caps || 0,
      activeBonuses: a.player.active_bonuses || 0,
      activePenalties: a.player.active_penalties || 0,
      currentStreak: a.player.current_streak || 0,
      gameSequences: playerGameData[a.player.id]?.sequences || [],
      latestSequence
    };

    const bStats = {
      caps: b.player.caps || 0,
      activeBonuses: b.player.active_bonuses || 0,
      activePenalties: b.player.active_penalties || 0,
      currentStreak: b.player.current_streak || 0,
      gameSequences: playerGameData[b.player.id]?.sequences || [],
      latestSequence
    };

    const aXP = calculatePlayerXP(aStats);
    const bXP = calculatePlayerXP(bStats);
    return bXP - aXP;
  });

  if (loading || !latestSequence) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {sortedRegistrations.map((registration) => {
        const playerData = playerGameData[registration.player.id] || { sequences: [], wins: 0, total: 0 };
        
        // Calculate XP using the same method as XPBreakdown
        const stats = {
          caps: registration.player.caps || 0,
          activeBonuses: registration.player.active_bonuses || 0,
          activePenalties: registration.player.active_penalties || 0,
          currentStreak: registration.player.current_streak || 0,
          gameSequences: playerData.sequences,
          latestSequence
        };

        // Calculate XP and win rate
        const playerXP = calculatePlayerXP(stats);
        const winRate = playerData.total > 0 
          ? Number(((playerData.wins / playerData.total) * 100).toFixed(1))
          : 0;

        // Calculate rarity based on all players' XP
        const rarity = calculateRarity(playerXP, allPlayersXP ? Object.values(allPlayersXP) : []);
        
        return (
          <PlayerCard
            key={registration.id}
            id={registration.player.id}
            friendlyName={registration.player.friendly_name}
            xp={playerXP}
            caps={registration.player.caps || 0}
            preferredPosition={registration.player.preferred_position || ''}
            activeBonuses={registration.player.active_bonuses || 0}
            activePenalties={registration.player.active_penalties || 0}
            winRate={winRate}
            currentStreak={registration.player.current_streak || 0}
            maxStreak={registration.player.max_streak || 0}
            rarity={rarity}
            avatarSvg={registration.player.avatar_svg || ''}
            isRandomlySelected={registration.randomly_selected}
            gameSequences={playerData.sequences}
          />
        );
      })}
    </div>
  );
};
