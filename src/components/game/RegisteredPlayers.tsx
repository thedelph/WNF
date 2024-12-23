import React from 'react';
import { FaUser } from 'react-icons/fa';
import { calculatePlayerXP } from '../../utils/xpCalculations';
import { calculateRarity } from '../../utils/rarityCalculations';
import PlayerCard from '../PlayerCard';

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
  const getCalculatedXP = (registration: GameRegistration): number => {
    if (!registration?.player) {
      return 0;
    }
    
    const stats = {
      caps: registration.player.caps || 0,
      activeBonuses: registration.player.active_bonuses || 0,
      activePenalties: registration.player.active_penalties || 0,
      currentStreak: registration.player.current_streak || 0
    };
    
    return calculatePlayerXP(stats);
  };

  // Filter out any invalid registrations and sort by XP
  const validRegistrations = (registrations || []).filter(reg => {
    const isValid = reg && reg.player && reg.id;
    return isValid;
  });

  const sortedRegistrations = [...validRegistrations].sort(
    (a, b) => getCalculatedXP(b) - getCalculatedXP(a)
  );

  // Calculate rarity based on XP distribution
  const allXPValues = sortedRegistrations.map(r => getCalculatedXP(r));

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
          if (!registration?.player) return null;
          
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
                rarity={calculateRarity(getCalculatedXP(registration), allXPValues)}
                avatarSvg={registration.player.avatar_svg}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
