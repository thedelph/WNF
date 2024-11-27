import React, { useEffect, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { calculatePlayerXP, PlayerStats } from '../../utils/xpCalculations';
import { calculateRarity } from '../../utils/rarityCalculations';
import PlayerCard from '../PlayerCard';
import { supabase } from '../../utils/supabase';

interface RegisteredPlayersProps {
  registrations: Array<{
    id: string;
    friendly_name: string;
    xp: number;
    stats: PlayerStats;
  }>;
  selectionNotes?: string[];
}

interface ExtendedPlayerData {
  id: string;
  friendly_name: string;
  preferred_position: string;
  win_rate: number;
  max_streak: number;
  avatar_svg: string;
  stats: PlayerStats;
}

export const RegisteredPlayers: React.FC<RegisteredPlayersProps> = ({ 
  registrations,
  selectionNotes = []
}) => {
  const [extendedPlayerData, setExtendedPlayerData] = useState<Record<string, ExtendedPlayerData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExtendedPlayerData = async () => {
      try {
        if (registrations.length === 0) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('players')
          .select('id, friendly_name, preferred_position, win_rate, max_streak, avatar_svg')
          .in('id', registrations.map(r => r.id));
        
        if (error) throw error;
        
        const playerDataMap = data.reduce((acc, player) => {
          const registration = registrations.find(r => r.id === player.id);
          if (registration) {
            acc[registration.id] = {
              ...player,
              stats: registration.stats
            };
          }
          return acc;
        }, {} as Record<string, ExtendedPlayerData>);
        
        setExtendedPlayerData(playerDataMap);
      } catch (error) {
        console.error('Error fetching player data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExtendedPlayerData();
  }, [registrations]);

  const getCalculatedXP = (player: { stats: PlayerStats }): number => {
    return calculatePlayerXP(player.stats);
  };

  // Sort players by XP
  const sortedPlayers = [...registrations].sort(
    (a, b) => getCalculatedXP(b) - getCalculatedXP(a)
  );

  // Calculate rarity based on XP distribution
  const allXPValues = sortedPlayers.map(p => getCalculatedXP(p));

  return (
    <div className="space-y-6 mt-6">
      {selectionNotes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Selection Notes:</h3>
          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
            {selectionNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div>
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <FaUser className="text-blue-500" />
          Registered Players ({sortedPlayers.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div>Loading player data...</div>
          ) : (
            sortedPlayers.map((player) => {
              const extendedData = extendedPlayerData[player.id];
              if (!extendedData) {
                // Use the basic player data if extended data is not available
                return (
                  <PlayerCard
                    key={player.id}
                    id={player.id}
                    friendlyName={player.friendly_name}
                    caps={player.stats.caps}
                    preferredPosition=""
                    activeBonuses={player.stats.activeBonuses}
                    activePenalties={player.stats.activePenalties}
                    winRate={0}
                    currentStreak={player.stats.currentStreak}
                    maxStreak={0}
                    rarity={calculateRarity(getCalculatedXP(player), allXPValues)}
                    avatarSvg=""
                  />
                );
              }

              return (
                <PlayerCard
                  key={player.id}
                  id={player.id}
                  friendlyName={extendedData.friendly_name}
                  caps={player.stats.caps}
                  preferredPosition={extendedData.preferred_position || ''}
                  activeBonuses={player.stats.activeBonuses}
                  activePenalties={player.stats.activePenalties}
                  winRate={extendedData.win_rate}
                  currentStreak={player.stats.currentStreak}
                  maxStreak={extendedData.max_streak}
                  rarity={calculateRarity(getCalculatedXP(player), allXPValues)}
                  avatarSvg={extendedData.avatar_svg || ''}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
