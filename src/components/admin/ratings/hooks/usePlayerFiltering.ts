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
        (player.average_gk_rating ?? 0) >= filterConfig.minGk &&
        (player.average_gk_rating ?? 0) <= filterConfig.maxGk &&
        (player.ratings?.length || 0) >= filterConfig.minTotalRatings
      );

      // Position filtering: if positions are selected, player must have at least one matching primary position (>=50% consensus)
      const matchesPosition = filterConfig.selectedPositions.length === 0 || (
        player.position_consensus?.some(pos =>
          pos.percentage >= 50 && filterConfig.selectedPositions.includes(pos.position)
        ) ?? false
      );

      return matchesSearch && matchesFilter && matchesPosition;
    }), [players, searchTerm, filterConfig]);

  return filteredPlayers;
};
