import React from 'react';
import { format } from 'date-fns';
import { Tooltip } from '../ui/Tooltip';
import { usePlayerToken } from '../../hooks/usePlayerToken';
import { PiCoinDuotone } from "react-icons/pi";

interface TokenToggleProps {
  playerId: string;
  disabled?: boolean;
  value: boolean;
  onChange: (useToken: boolean) => void;
}

export const TokenToggle: React.FC<TokenToggleProps> = ({
  playerId,
  disabled = false,
  value,
  onChange
}) => {
  const { data: tokenInfo, isLoading, isError } = usePlayerToken(playerId);

  // Don't render anything if there's an error or no token available
  if (isError || !tokenInfo?.hasToken) return null;

  // Show loading state
  if (isLoading) {
    return (
      <div className="form-control animate-pulse">
        <label className="label gap-4">
          <span className="label-text">Checking token availability...</span>
          <div className="w-12 h-6 bg-base-300 rounded-full"></div>
        </label>
      </div>
    );
  }

  return (
    <Tooltip content={
      <div className="space-y-2 max-w-xs">
        <p>Using a token guarantees you a slot in this game.</p>
        <p>Tokens are reissued every 4 weeks.</p>
      </div>
    }>
      <div className="form-control">
        <label className="label cursor-pointer gap-4">
          <span className="flex items-center gap-2">
            <PiCoinDuotone 
              size={20} 
              className={value ? 'text-yellow-400' : 'text-gray-400'} 
            />
            <span className="label-text">Use priority token?</span>
          </span>
          <input
            type="checkbox"
            className="toggle toggle-success"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        </label>
      </div>
    </Tooltip>
  );
};
