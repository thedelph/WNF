import React, { useState } from 'react';
import { usePlayerGrid } from '../../hooks/usePlayerGrid';
import { Player } from './PlayerCardTypes';
import { PlayerGridFilters } from './grid/PlayerGridFilters';
import { PlayerGridLayout } from './grid/PlayerGridLayout';

/**
 * Main component for displaying and managing the player card grid
 * Handles filtering, sorting, and layout of player cards
 */
export default function PlayerCardGrid() {
  const { players, loading } = usePlayerGrid();

  const [sortConfig, setSortConfig] = useState<{
    key: keyof Player;
    direction: 'asc' | 'desc';
  }>({ key: 'xp', direction: 'desc' });
  const [filterBy, setFilterBy] = useState('');
  const [whatsAppMembersOnly, setWhatsAppMembersOnly] = useState(true);
  // Hide players with 0 XP by default for cleaner player list
  const [hideZeroXpPlayers, setHideZeroXpPlayers] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    minCaps: '',
    maxCaps: '',
    minWinRate: '',
    maxWinRate: '',
    minStreak: '',
    maxStreak: '',
    rarity: ''
  });

  // Apply filters to players
  const filteredPlayers = players
    .filter(player => {
      // Text search filter (only friendly name)
      const searchTerm = filterBy.toLowerCase();
      const name = player.friendlyName?.toLowerCase() || '';
      const nameMatch = name.includes(searchTerm);

      // Numeric range filters
      const capsInRange = (filters.minCaps === '' || player.caps >= Number(filters.minCaps)) &&
                         (filters.maxCaps === '' || player.caps <= Number(filters.maxCaps));
      
      const winRateInRange = (filters.minWinRate === '' || player.winRate >= Number(filters.minWinRate)) &&
                            (filters.maxWinRate === '' || player.winRate <= Number(filters.maxWinRate));
      
      const streakInRange = (filters.minStreak === '' || player.currentStreak >= Number(filters.minStreak)) &&
                           (filters.maxStreak === '' || player.currentStreak <= Number(filters.maxStreak));

      // Rarity filter
      const rarityMatch = !filters.rarity || player.rarity === filters.rarity;

      // WhatsApp members filter
      const whatsAppMatch = !whatsAppMembersOnly || (player.whatsapp_group_member === 'Yes' || player.whatsapp_group_member === 'Proxy');

      // Filter out players with 0 XP when toggle is enabled
      const xpMatch = !hideZeroXpPlayers || player.xp > 0;

      return nameMatch && capsInRange && winRateInRange && streakInRange && rarityMatch && whatsAppMatch && xpMatch;
    });

  // Sort filtered players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const compareResult = typeof aValue === 'string'
      ? aValue.localeCompare(bValue as string)
      : (aValue as number) - (bValue as number);

    return sortConfig.direction === 'asc' ? compareResult : -compareResult;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="space-y-6">
        <PlayerGridFilters
          filters={filters}
          setFilters={setFilters}
          filterBy={filterBy}
          setFilterBy={setFilterBy}
          whatsAppMembersOnly={whatsAppMembersOnly}
          setWhatsAppMembersOnly={setWhatsAppMembersOnly}
          hideZeroXpPlayers={hideZeroXpPlayers}
          setHideZeroXpPlayers={setHideZeroXpPlayers}
          isFiltersOpen={isFiltersOpen}
          setIsFiltersOpen={setIsFiltersOpen}
          sortConfig={sortConfig}
          setSortConfig={setSortConfig}
        />
        <PlayerGridLayout players={sortedPlayers} />
      </div>
    </div>
  );
}