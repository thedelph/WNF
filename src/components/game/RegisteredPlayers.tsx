import React from 'react';
import { FaUser } from 'react-icons/fa';
import { calculatePlayerXP } from '../../utils/xpCalculations';
import { calculateRarity } from '../../utils/rarityCalculations';
import PlayerCard from '../PlayerCard';
import { usePlayerStats } from '../../hooks/usePlayerStats';

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

  // Filter out any invalid registrations and sort by XP
  const validRegistrations = (registrations || []).filter(reg => {
    const isValid = reg && reg.player && reg.id;
    return isValid;
  });

  const sortedRegistrations = [...validRegistrations].sort((a, b) => {
    const aXP = calculatePlayerXP({
      caps: a.player.caps || 0,
      activeBonuses: a.player.active_bonuses || 0,
      activePenalties: a.player.active_penalties || 0,
      currentStreak: a.player.current_streak || 0
    });
    const bXP = calculatePlayerXP({
      caps: b.player.caps || 0,
      activeBonuses: b.player.active_bonuses || 0,
      activePenalties: b.player.active_penalties || 0,
      currentStreak: b.player.current_streak || 0
    });
    return bXP - aXP;
  });

  if (!sortedRegistrations.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No registered players yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <FaUser className="text-blue-500" />
        Registered Players ({sortedRegistrations.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedRegistrations.map((registration) => {
          const playerStats = {
            caps: registration.player.caps || 0,
            activeBonuses: registration.player.active_bonuses || 0,
            activePenalties: registration.player.active_penalties || 0,
            currentStreak: registration.player.current_streak || 0
          };

          const playerXP = calculatePlayerXP(playerStats);

          return (
            <div key={registration.id} className="relative">
              {registration.randomly_selected && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                  Random Pick
                </div>
              )}
              <PlayerCard
                id={registration.player.id}
                friendlyName={registration.player.friendly_name}
                caps={registration.player.caps}
                preferredPosition={registration.player.preferred_position}
                activeBonuses={registration.player.active_bonuses}
                activePenalties={registration.player.active_penalties}
                winRate={registration.player.win_rate}
                currentStreak={registration.player.current_streak}
                maxStreak={registration.player.max_streak}
                rarity={!loading && allPlayersXP.length > 0 ? calculateRarity(playerXP, allPlayersXP) : 'Common'}
                avatarSvg={registration.player.avatar_svg}
                isRandomlySelected={registration.randomly_selected}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
