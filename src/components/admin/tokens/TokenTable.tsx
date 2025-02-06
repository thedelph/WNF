import React from 'react';
import { Tooltip } from '../../ui/Tooltip';
import { TokenData } from '../../../types/tokens';

interface TokenTableProps {
  tokens: TokenData[];
  loading: boolean;
  onRemoveToken: (tokenId: string) => Promise<void>;
  onIssueToken: (playerId: string) => Promise<void>;
}

export const TokenTable: React.FC<TokenTableProps> = ({
  tokens,
  loading,
  onRemoveToken,
  onIssueToken
}) => {
  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getTokenStatus = (token: TokenData) => {
    if (!token.issued_at) return { status: 'No Token', badge: 'badge-error' };
    if (!token.used_at) return { status: 'Active', badge: 'badge-success' };
    
    // Calculate if in cooldown period (22 days from used_at)
    const cooldownEnd = new Date(token.used_at);
    cooldownEnd.setDate(cooldownEnd.getDate() + 22);
    const now = new Date();
    
    if (now < cooldownEnd) {
      const daysLeft = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { 
        status: `Cooldown (${daysLeft}d)`, 
        badge: 'badge-warning'
      };
    }
    
    return { status: 'Ready for New Token', badge: 'badge-info' };
  };

  const getTokenAvailabilityDate = (token: TokenData) => {
    if (!token.used_at) return null;
    const cooldownEnd = new Date(token.used_at);
    cooldownEnd.setDate(cooldownEnd.getDate() + 22);
    return cooldownEnd;
  };

  const formatAvailabilityDate = (token: TokenData) => {
    const availabilityDate = getTokenAvailabilityDate(token);
    if (!availabilityDate) return 'N/A';
    
    const now = new Date();
    if (now >= availabilityDate) return 'Available Now';
    
    // Format the date and also show days remaining
    const daysLeft = Math.ceil((availabilityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `${availabilityDate.toLocaleDateString()} (${daysLeft}d)`;
  };

  const canIssueToken = (token: TokenData) => {
    // Can issue if they have no token or if cooldown period has passed
    if (!token.issued_at) return true;
    if (!token.used_at) return false; // Has active token
    
    // Check if cooldown period has passed
    const cooldownEnd = new Date(token.used_at);
    cooldownEnd.setDate(cooldownEnd.getDate() + 22);
    return new Date() >= cooldownEnd;
  };

  const isInCooldown = (token: TokenData) => {
    if (!token.used_at) return false;
    const cooldownEnd = new Date(token.used_at);
    cooldownEnd.setDate(cooldownEnd.getDate() + 22);
    return new Date() < cooldownEnd;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Player</th>
            <th>Status</th>
            <th>Issued</th>
            <th>Used</th>
            <th>Available</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => {
            const tokenStatus = getTokenStatus(token);
            const availabilityDate = getTokenAvailabilityDate(token);
            return (
              <tr key={token.player_id}>
                <td>{token.friendly_name}</td>
                <td>
                  <span className={`badge ${tokenStatus.badge}`}>
                    {tokenStatus.status}
                  </span>
                </td>
                <td>{formatDate(token.issued_at)}</td>
                <td>
                  {token.used_at ? (
                    <Tooltip content={`Token will be available on ${availabilityDate?.toLocaleDateString()}`}>
                      <span>{formatDate(token.used_at)}</span>
                    </Tooltip>
                  ) : (
                    formatDate(token.used_at)
                  )}
                </td>
                <td>
                  <span className={availabilityDate && new Date() >= availabilityDate ? 'text-success' : ''}>
                    {formatAvailabilityDate(token)}
                  </span>
                </td>
                <td className="space-x-2">
                  {!token.used_at && token.issued_at ? (
                    <Tooltip content="Remove player's active token">
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => onRemoveToken(token.id)}
                      >
                        Remove Token
                      </button>
                    </Tooltip>
                  ) : canIssueToken(token) ? (
                    <Tooltip content="Issue a new token to player">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => onIssueToken(token.player_id)}
                      >
                        Issue Token
                      </button>
                    </Tooltip>
                  ) : isInCooldown(token) ? (
                    <>
                      <Tooltip content="Player is in cooldown period">
                        <button
                          className="btn btn-disabled btn-sm"
                          disabled
                        >
                          In Cooldown
                        </button>
                      </Tooltip>
                      <Tooltip content="Override cooldown and issue new token">
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => onIssueToken(token.player_id)}
                        >
                          Force Issue
                        </button>
                      </Tooltip>
                    </>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
