import React from 'react';
import { TokenData } from '../../../types/tokens';

interface TokenStatsProps {
  tokens: TokenData[];
}

export const TokenStats: React.FC<TokenStatsProps> = ({ tokens }) => {
  const hasActiveToken = (token: TokenData) => {
    return !token.used_at && (!token.expires_at || new Date(token.expires_at) > new Date());
  };

  return (
    <div className="stats shadow">
      <div className="stat">
        <div className="stat-title">Active Tokens</div>
        <div className="stat-value text-primary">
          {tokens.filter(token => hasActiveToken(token)).length}
        </div>
      </div>
      <div className="stat">
        <div className="stat-title">Used Tokens</div>
        <div className="stat-value text-secondary">
          {tokens.filter(token => token.used_at).length}
        </div>
      </div>
    </div>
  );
};
