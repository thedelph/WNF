import React, { useState, useMemo } from 'react';
import { Tooltip } from '../../ui/Tooltip';
import { PiSortAscendingBold, PiSortDescendingBold, PiTrendUp, PiTrendDown, PiMinus } from "react-icons/pi";

interface XPComparisonData {
  player_id: string;
  friendly_name: string;
  current_streak: number;
  current_xp: number;
  current_rank: number;
  current_rarity: string;
  v2_xp: number;
  v2_rank: number;
  v2_rarity: string;
  xp_difference: number;
  rank_difference: number;
  current_streak_bonus_pct: number;
  v2_streak_bonus_pct: number;
}

interface XPComparisonDashboardProps {
  data: XPComparisonData[];
  loading: boolean;
}

type SortField = 'friendly_name' | 'current_xp' | 'v2_xp' | 'xp_difference' | 'rank_difference' | 'current_rank' | 'v2_rank' | 'current_streak';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'rank_improved' | 'rank_declined' | 'rank_same';

export const XPComparisonDashboard: React.FC<XPComparisonDashboardProps> = ({
  data,
  loading
}) => {
  const [sortField, setSortField] = useState<SortField>('current_rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <PiSortAscendingBold className="inline ml-1" /> :
      <PiSortDescendingBold className="inline ml-1" />;
  };

  const sortedAndFilteredData = useMemo(() => {
    let filtered = [...data];

    // Apply filters
    switch (filterType) {
      case 'rank_improved':
        // Positive rank_difference means lower rank number in v2 (better rank)
        filtered = filtered.filter(d => d.rank_difference > 0);
        break;
      case 'rank_declined':
        // Negative rank_difference means higher rank number in v2 (worse rank)
        filtered = filtered.filter(d => d.rank_difference < 0);
        break;
      case 'rank_same':
        filtered = filtered.filter(d => d.rank_difference === 0);
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;

      // Handle string comparison for friendly_name
      if (sortField === 'friendly_name') {
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      const comparison = (aVal as number) - (bVal as number);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [data, sortField, sortDirection, filterType]);

  const stats = useMemo(() => {
    const improved = data.filter(d => d.rank_difference > 0).length;
    const declined = data.filter(d => d.rank_difference < 0).length;
    const same = data.filter(d => d.rank_difference === 0).length;
    const avgXpDiff = data.length > 0
      ? Math.round(data.reduce((sum, d) => sum + d.xp_difference, 0) / data.length)
      : 0;
    return { improved, declined, same, avgXpDiff };
  }, [data]);

  const getRankChangeIcon = (rankDiff: number) => {
    if (rankDiff > 0) return <PiTrendUp className="text-success" />;
    if (rankDiff < 0) return <PiTrendDown className="text-error" />;
    return <PiMinus className="text-base-content/50" />;
  };

  const getRarityBadge = (rarity: string | null) => {
    if (!rarity) return null;
    const badgeClass = {
      'Legendary': 'badge-warning',
      'World Class': 'badge-primary',
      'Professional': 'badge-secondary',
      'Semi Pro': 'badge-accent',
      'Amateur': 'badge-ghost',
      'Retired': 'badge-neutral'
    }[rarity] || 'badge-ghost';
    return <span className={`badge badge-sm ${badgeClass}`}>{rarity}</span>;
  };

  const formatXPDiff = (diff: number) => {
    if (diff > 0) return <span className="text-success">+{diff}</span>;
    if (diff < 0) return <span className="text-error">{diff}</span>;
    return <span className="text-base-content/50">0</span>;
  };

  const formatRankDiff = (diff: number) => {
    // Positive diff means improved rank (lower number in v2)
    if (diff > 0) return <span className="text-success">+{diff}</span>;
    if (diff < 0) return <span className="text-error">{diff}</span>;
    return <span className="text-base-content/50">-</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Stats Summary */}
      <div className="stats stats-vertical sm:stats-horizontal shadow w-full bg-base-200">
        <div className="stat">
          <div className="stat-title">Rank Improved</div>
          <div className="stat-value text-success">{stats.improved}</div>
          <div className="stat-desc">Players with better v2 rank</div>
        </div>
        <div className="stat">
          <div className="stat-title">Rank Declined</div>
          <div className="stat-value text-error">{stats.declined}</div>
          <div className="stat-desc">Players with worse v2 rank</div>
        </div>
        <div className="stat">
          <div className="stat-title">Rank Same</div>
          <div className="stat-value">{stats.same}</div>
          <div className="stat-desc">No change in rank</div>
        </div>
        <div className="stat">
          <div className="stat-title">Avg XP Diff</div>
          <div className={`stat-value ${stats.avgXpDiff > 0 ? 'text-success' : stats.avgXpDiff < 0 ? 'text-error' : ''}`}>
            {stats.avgXpDiff > 0 ? '+' : ''}{stats.avgXpDiff}
          </div>
          <div className="stat-desc">Current - v2</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="join">
          <button
            className={`join-item btn btn-sm ${filterType === 'all' ? 'btn-active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({data.length})
          </button>
          <button
            className={`join-item btn btn-sm ${filterType === 'rank_improved' ? 'btn-active' : ''}`}
            onClick={() => setFilterType('rank_improved')}
          >
            <PiTrendUp className="text-success" /> Improved ({stats.improved})
          </button>
          <button
            className={`join-item btn btn-sm ${filterType === 'rank_declined' ? 'btn-active' : ''}`}
            onClick={() => setFilterType('rank_declined')}
          >
            <PiTrendDown className="text-error" /> Declined ({stats.declined})
          </button>
          <button
            className={`join-item btn btn-sm ${filterType === 'rank_same' ? 'btn-active' : ''}`}
            onClick={() => setFilterType('rank_same')}
          >
            <PiMinus /> Same ({stats.same})
          </button>
        </div>

        <div className="text-sm text-base-content/70">
          Showing {sortedAndFilteredData.length} of {data.length} players
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-full px-4 sm:px-0">
          <table className="table table-zebra w-full table-sm">
            <thead>
              <tr>
                <th onClick={() => handleSort('friendly_name')} className="cursor-pointer">
                  Player {getSortIcon('friendly_name')}
                </th>
                <th onClick={() => handleSort('current_streak')} className="cursor-pointer text-center hidden sm:table-cell">
                  Streak {getSortIcon('current_streak')}
                </th>
                <th onClick={() => handleSort('current_xp')} className="cursor-pointer text-right">
                  Current XP {getSortIcon('current_xp')}
                </th>
                <th onClick={() => handleSort('current_rank')} className="cursor-pointer text-center hidden sm:table-cell">
                  Rank {getSortIcon('current_rank')}
                </th>
                <th onClick={() => handleSort('v2_xp')} className="cursor-pointer text-right">
                  v2 XP {getSortIcon('v2_xp')}
                </th>
                <th onClick={() => handleSort('v2_rank')} className="cursor-pointer text-center hidden sm:table-cell">
                  v2 Rank {getSortIcon('v2_rank')}
                </th>
                <th onClick={() => handleSort('xp_difference')} className="cursor-pointer text-right hidden lg:table-cell">
                  XP Diff {getSortIcon('xp_difference')}
                </th>
                <th onClick={() => handleSort('rank_difference')} className="cursor-pointer text-center">
                  Rank Change {getSortIcon('rank_difference')}
                </th>
                <th className="text-center hidden lg:table-cell">Streak Bonus</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredData.map((player) => (
                <tr key={player.player_id}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium">{player.friendly_name}</span>
                      <div className="flex gap-1 sm:hidden">
                        {getRarityBadge(player.current_rarity)}
                      </div>
                    </div>
                  </td>
                  <td className="text-center hidden sm:table-cell">
                    <Tooltip content={`Current streak: ${player.current_streak} games`}>
                      <span className={player.current_streak >= 10 ? 'text-warning font-bold' : ''}>
                        {player.current_streak}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono">{player.current_xp?.toLocaleString() ?? 0}</span>
                      <span className="hidden sm:inline">{getRarityBadge(player.current_rarity)}</span>
                    </div>
                  </td>
                  <td className="text-center hidden sm:table-cell">
                    <span className="font-mono">#{player.current_rank}</span>
                  </td>
                  <td className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono">{player.v2_xp?.toLocaleString() ?? 0}</span>
                      <span className="hidden sm:inline">{getRarityBadge(player.v2_rarity)}</span>
                    </div>
                  </td>
                  <td className="text-center hidden sm:table-cell">
                    <span className="font-mono">#{player.v2_rank}</span>
                  </td>
                  <td className="text-right hidden lg:table-cell font-mono">
                    {formatXPDiff(player.xp_difference)}
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getRankChangeIcon(player.rank_difference)}
                      <span className="font-mono">{formatRankDiff(player.rank_difference)}</span>
                    </div>
                  </td>
                  <td className="text-center hidden lg:table-cell">
                    <Tooltip content={`Current: +${player.current_streak_bonus_pct}% | v2: +${player.v2_streak_bonus_pct}%`}>
                      <div className="flex flex-col text-xs">
                        <span className="text-base-content/70">+{player.current_streak_bonus_pct}%</span>
                        <span className="text-primary">+{player.v2_streak_bonus_pct}%</span>
                      </div>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="alert alert-info">
        <div className="text-sm">
          <strong>Note:</strong> XP Difference = Current XP - v2 XP (positive means current system gives more XP).
          Rank Change shows if player would rank higher (green) or lower (red) under v2 system.
        </div>
      </div>
    </div>
  );
};
