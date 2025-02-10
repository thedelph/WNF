import React from 'react';
import { Tooltip } from '../ui/Tooltip';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { PiCoinDuotone } from "react-icons/pi";
import { BsCheckCircle, BsXCircle } from "react-icons/bs";

interface TokenStatusProps {
  status: string;
  lastUsedAt: string | null;
  nextTokenAt: string | null;
  createdAt: string;
  playerName?: string;
  isEligible?: boolean;
  recentGames?: string[];
  hasPlayedInLastTenGames?: boolean;
  hasRecentSelection?: boolean;
}

// Component to display token status with animations and tooltips
export default function TokenStatus({ 
  status, 
  lastUsedAt, 
  nextTokenAt, 
  createdAt, 
  playerName,
  isEligible,
  recentGames,
  hasPlayedInLastTenGames,
  hasRecentSelection
}: TokenStatusProps) {
  // Format dates for display
  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy');
  };

  // Debug logging
  console.log('[TokenStatus] Props:', {
    status,
    isEligible,
    hasPlayedInLastTenGames,
    hasRecentSelection,
    recentGames
  });

  const getStatusColor = () => {
    if (status === 'AVAILABLE' && isEligible) {
      return 'bg-success text-success-content';
    }
    if (!isEligible) {
      return 'bg-error text-error-content';
    }
    switch (status) {
      case 'AVAILABLE':
        return 'bg-success text-success-content';
      case 'RESERVED':
        return 'bg-warning text-warning-content';
      case 'CONSUMED':
      case 'COOLDOWN':
        return 'bg-error text-error-content';
      default:
        return 'bg-neutral text-neutral-content';
    }
  };

  const getDisplayStatus = () => {
    if (!isEligible) {
      return 'INELIGIBLE';
    }
    return status;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-200 shadow-xl p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <PiCoinDuotone 
          size={24} 
          className={status === 'AVAILABLE' && isEligible ? 'text-yellow-400' : 'text-gray-400'} 
        />
        <h3 className="text-lg font-bold">Priority Token Status</h3>
      </div>
      
      <div className="flex flex-col gap-2">
        {/* Current Status */}
        <Tooltip content={playerName ? `${playerName}'s token status` : "Your current token status"}>
          <div className="flex items-center gap-2">
            <span className="text-sm">Status:</span>
            <span className={`px-2 py-1 rounded-md text-sm font-medium ${getStatusColor()}`}>
              {getDisplayStatus()}
            </span>
          </div>
        </Tooltip>

        {/* Eligibility Criteria */}
        <div className="mt-2 text-sm">
          <h4 className="font-medium mb-1">Eligibility Requirements:</h4>
          <div className="flex items-center gap-2 mb-1">
            {hasPlayedInLastTenGames ? (
              <BsCheckCircle className="text-success" />
            ) : (
              <BsXCircle className="text-error" />
            )}
            <Tooltip content="Must have played in at least one of the last 10 games">
              <span className={hasPlayedInLastTenGames ? "text-success" : "text-error"}>
                Recent Activity
              </span>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            {hasRecentSelection ? (
              <BsXCircle className="text-error" />
            ) : (
              <BsCheckCircle className="text-success" />
            )}
            <Tooltip content="Must not have been selected in any of the last 3 games">
              <span className={!hasRecentSelection ? "text-success" : "text-error"}>
                Selection Cooldown
              </span>
            </Tooltip>
          </div>
        </div>

        {/* Last Used Date */}
        {lastUsedAt && (
          <Tooltip content={playerName ? `When ${playerName} last used their priority token` : "When you last used your priority token"}>
            <div className="text-sm">
              Last Used: {formatDate(lastUsedAt)}
            </div>
          </Tooltip>
        )}

        {/* Recent Games - Show if ineligible due to recent selection */}
        {hasRecentSelection && (
          <Tooltip content="Selected in one of the last 3 games">
            <div className="text-sm text-error/80">
              Selected in: {recentGames?.join(', ')}
            </div>
          </Tooltip>
        )}

        {/* Next Token Date - Only show if eligible */}
        {nextTokenAt && isEligible && (
          <Tooltip content={playerName ? `When ${playerName}'s next priority token will be available` : "When your next priority token will be available"}>
            <div className="text-sm">
              Next Token: {formatDate(nextTokenAt)} 
              <span className="text-xs opacity-75 ml-2">
                ({formatDistanceToNow(new Date(nextTokenAt), { addSuffix: true })})
              </span>
            </div>
          </Tooltip>
        )}

        {/* Token Age */}
        {status === 'AVAILABLE' && isEligible && (
          <Tooltip content={playerName ? `When ${playerName}'s token was issued` : "When this token was issued"}>
            <div className="text-xs opacity-75">
              Token issued: {formatDate(createdAt)}
            </div>
          </Tooltip>
        )}
      </div>
    </motion.div>
  );
}
