import React, { useState, useMemo } from 'react';
import { Tooltip } from '../../ui/Tooltip';
import { TokenData } from '../../../types/tokens';
import { PiCoinDuotone, PiSortAscendingBold, PiSortDescendingBold } from "react-icons/pi";
import { IoFilterOutline } from "react-icons/io5";

interface TokenTableProps {
  tokens: TokenData[];
  loading: boolean;
  onRemoveToken: (tokenId: string) => Promise<void>;
  onIssueToken: (playerId: string) => Promise<void>;
}

type SortField = 'friendly_name' | 'issued_at' | 'used_at' | null;
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'active' | 'eligible' | 'ineligible';

export const TokenTable: React.FC<TokenTableProps> = ({
  tokens,
  loading,
  onRemoveToken,
  onIssueToken
}) => {
  const [sortField, setSortField] = useState<SortField>(null);
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
      <PiSortAscendingBold className="inline" /> : 
      <PiSortDescendingBold className="inline" />;
  };

  const sortedAndFilteredTokens = useMemo(() => {
    let filtered = [...tokens];

    // Apply filters
    switch (filterType) {
      case 'active':
        filtered = filtered.filter(t => t.issued_at && !t.used_at);
        break;
      case 'eligible':
        filtered = filtered.filter(t => t.is_eligible);
        break;
      case 'ineligible':
        filtered = filtered.filter(t => !t.is_eligible);
        break;
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        // Handle null values
        if (aVal === null) aVal = '';
        if (bVal === null) bVal = '';
        
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [tokens, sortField, sortDirection, filterType]);

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getTokenStatus = (token: TokenData) => {
    if (!token.issued_at) {
      return token.is_eligible 
        ? { status: 'Eligible', badge: 'badge-success' }
        : { status: 'Ineligible', badge: 'badge-error' };
    }
    if (!token.used_at) return { status: 'Active', badge: 'badge-success' };
    return token.is_eligible 
      ? { status: 'Eligible', badge: 'badge-success' }
      : { status: 'Ineligible', badge: 'badge-error' };
  };

  const getTokenAvailabilityDate = (token: TokenData) => {
    // Tokens are now based on game participation, not cooldown periods
    return null;
  };

  const formatAvailabilityDate = (token: TokenData) => {
    if (!token.used_at) return 'Active';
    return token.is_eligible ? 'Eligible Now' : 'Not Eligible';
  };

  const canIssueToken = (token: TokenData) => {
    // Can issue if they don't have an active token and are eligible
    return (!token.issued_at || !!token.used_at) && token.is_eligible;
  };

  const isInCooldown = (token: TokenData) => {
    // No more cooldown, but we'll use this for ineligible players
    return !token.is_eligible;
  };

  const getIneligibilityReason = (token: TokenData) => {
    if (token.is_eligible) return null;
    return token.reason || 'Not eligible for a token';
  };

  const getEligibilityTooltip = (token: TokenData) => {
    if (token.is_eligible) {
      return "Player has played in at least one of the last 10 games and has not been selected in any of the last 3 games";
    }
    return token.reason || 'Not eligible for a token';
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="join">
          <button 
            className={`join-item btn btn-sm ${filterType === 'all' ? 'btn-active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          <button 
            className={`join-item btn btn-sm ${filterType === 'active' ? 'btn-active' : ''}`}
            onClick={() => setFilterType('active')}
          >
            Active
          </button>
          <button 
            className={`join-item btn btn-sm ${filterType === 'eligible' ? 'btn-active' : ''}`}
            onClick={() => setFilterType('eligible')}
          >
            Eligible
          </button>
          <button 
            className={`join-item btn btn-sm ${filterType === 'ineligible' ? 'btn-active' : ''}`}
            onClick={() => setFilterType('ineligible')}
          >
            Ineligible
          </button>
        </div>
        
        <div className="text-sm text-base-content/70">
          Showing {sortedAndFilteredTokens.length} players
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-full px-4 sm:px-0">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th onClick={() => handleSort('friendly_name')} className="cursor-pointer">
                  Player {getSortIcon('friendly_name')}
                </th>
                <th className="hidden sm:table-cell">Status</th>
                <th 
                  onClick={() => handleSort('issued_at')} 
                  className="hidden sm:table-cell cursor-pointer"
                >
                  Issued {getSortIcon('issued_at')}
                </th>
                <th 
                  onClick={() => handleSort('used_at')} 
                  className="hidden sm:table-cell cursor-pointer"
                >
                  Used {getSortIcon('used_at')}
                </th>
                <th className="hidden sm:table-cell">Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredTokens.map((token) => {
                const tokenStatus = getTokenStatus(token);
                return (
                  <tr key={token.player_id}>
                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{token.friendly_name}</span>
                          <div className="sm:hidden">
                            <span className={`badge ${tokenStatus.badge} badge-sm`}>
                              {tokenStatus.status}
                            </span>
                          </div>
                        </div>
                        <div className="sm:hidden flex flex-col text-xs space-y-0.5">
                          <div className="text-base-content/70">
                            {token.issued_at && (
                              <span>Issued {formatDate(token.issued_at)}</span>
                            )}
                            {token.used_at && (
                              <span className="ml-2">
                                • Used {formatDate(token.used_at)}
                              </span>
                            )}
                          </div>
                          {!token.is_eligible && (
                            <div className="text-error/80 font-medium">
                              {getIneligibilityReason(token)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <Tooltip content={getEligibilityTooltip(token)}>
                        <div className="flex items-center gap-2">
                          <PiCoinDuotone 
                            size={20} 
                            className={!token.used_at ? 'text-yellow-400' : token.is_eligible ? 'text-green-400' : 'text-base-content/40'} 
                          />
                          <span className={`badge ${tokenStatus.badge}`}>
                            {tokenStatus.status}
                          </span>
                          {!token.is_eligible && (
                            <span className="text-xs text-error/80 font-medium">
                              {getIneligibilityReason(token)}
                            </span>
                          )}
                        </div>
                      </Tooltip>
                    </td>
                    <td className="hidden sm:table-cell">{formatDate(token.issued_at)}</td>
                    <td className="hidden sm:table-cell">
                      {token.used_at ? (
                        <Tooltip content={getEligibilityTooltip(token)}>
                          <span>{formatDate(token.used_at)}</span>
                        </Tooltip>
                      ) : (
                        formatDate(token.used_at)
                      )}
                    </td>
                    <td className="hidden sm:table-cell">
                      <Tooltip content={getEligibilityTooltip(token)}>
                        <span className={token.is_eligible ? 'text-success' : 'text-error'}>
                          {formatAvailabilityDate(token)}
                        </span>
                      </Tooltip>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {!token.used_at && token.issued_at ? (
                          <Tooltip content="Remove player's active token">
                            <button
                              className="btn btn-error btn-sm"
                              onClick={() => onRemoveToken(token.id)}
                            >
                              Remove
                            </button>
                          </Tooltip>
                        ) : canIssueToken(token) ? (
                          <Tooltip content="Issue a new token to player">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => onIssueToken(token.player_id)}
                            >
                              Issue
                            </button>
                          </Tooltip>
                        ) : isInCooldown(token) ? (
                          <Tooltip content="Issue token anyway (overrides game participation rules)">
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => onIssueToken(token.player_id)}
                            >
                              Force
                            </button>
                          </Tooltip>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
