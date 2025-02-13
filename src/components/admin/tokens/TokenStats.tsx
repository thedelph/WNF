import React from 'react';
import { TokenData } from '../../../types/tokens';

interface TokenStatsProps {
  tokens: TokenData[];
}

export const TokenStats: React.FC<TokenStatsProps> = ({ tokens }) => {
  // Count active tokens - must be unused and not expired
  const activeTokens = tokens.filter(token => {
    const hasToken = token.issued_at != null;
    const isUnused = !token.used_at;
    const notExpired = !token.expires_at || new Date(token.expires_at) > new Date();
    return hasToken && isUnused && notExpired;
  }).length;

  // Count used tokens
  const usedTokens = tokens.filter(token => token.used_at != null).length;

  return (
    <div className="stats shadow">
      <div className="stat">
        <div className="stat-title">Active Tokens</div>
        <div className="stat-value text-primary">{activeTokens}</div>
        <div className="stat-desc">Unused and not expired</div>
      </div>
      <div className="stat">
        <div className="stat-title">Used Tokens</div>
        <div className="stat-value text-secondary">{usedTokens}</div>
        <div className="stat-desc">Already used in games</div>
      </div>
    </div>
  );
};
