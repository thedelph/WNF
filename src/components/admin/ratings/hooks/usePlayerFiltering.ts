import { useMemo } from 'react';
import { Player, FilterConfig } from '../types';

export const usePlayerFiltering = (
  players: Player[],
  searchTerm: string,
  filterConfig: FilterConfig
) => {
  const filteredPlayers = useMemo(() => 
    players.filter(player => {
      const matchesSearch = player.friendly_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = (
        (player.attack_rating ?? 0) >= filterConfig.minAttack &&
        (player.attack_rating ?? 0) <= filterConfig.maxAttack &&
        (player.defense_rating ?? 0) >= filterConfig.minDefense &&
        (player.defense_rating ?? 0) <= filterConfig.maxDefense &&
        (player.game_iq ?? 0) >= filterConfig.minGameIq &&
        (player.game_iq ?? 0) <= filterConfig.maxGameIq &&
        (player.ratings?.length || 0) >= filterConfig.minTotalRatings
      );
      return matchesSearch && matchesFilter;
    }), [players, searchTerm, filterConfig]);

  return filteredPlayers;
};
