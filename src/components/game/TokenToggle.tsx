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

  // If there's an error, show an error state but still allow toggling
  if (isError) {
    console.error('Error loading token info');
    return (
      <div className="form-control">
        <label className="label cursor-pointer gap-4">
          <span className="flex items-center gap-2 text-error">
            <PiCoinDuotone size={20} className="text-gray-400" />
            <span className="label-text">Error checking token</span>
          </span>
          <input
            type="checkbox"
            className="toggle toggle-error"
            checked={false}
            disabled={true}
          />
        </label>
      </div>
    );
  }

  // Don't render if no token available or not eligible
  if (!isLoading && (!tokenInfo?.hasToken || !tokenInfo?.isEligible)) return null;

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
        <p>Tokens are issued to WhatsApp group members who:</p>
        <ul className="list-disc pl-4">
          <li>Have played in at least one of the last 10 games</li>
          <li>Haven't been selected to play in any of the last 3 games</li>
        </ul>
        <p className="text-sm text-base-content/70">You can still get a token even if you registered, were a reserve, or dropped out - only being selected to play counts against you.</p>
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
