import { format } from 'date-fns';
import { PiCoinDuotone } from "react-icons/pi";
import { BsCheckCircle, BsXCircle } from "react-icons/bs";
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

interface TokenStatusProps {
  status: string;
  lastUsedAt?: string | null;
  createdAt?: string;
  isEligible?: boolean;
  recentGames?: string[];
  hasPlayedInLastTenGames?: boolean;
  hasRecentSelection?: boolean;
  hasOutstandingPayments?: boolean;
  outstandingPaymentsCount?: number;
  isLoading?: boolean;
  playerName?: string;
  whatsappGroupMember?: boolean;
}

// Component to display token status with animations and tooltips
export default function TokenStatus({ 
  status, 
  lastUsedAt, 
  createdAt, 
  isEligible,
  recentGames,
  hasPlayedInLastTenGames,
  hasRecentSelection,
  hasOutstandingPayments,
  outstandingPaymentsCount,
  isLoading = false,
  playerName,
  whatsappGroupMember,
}: TokenStatusProps) {
  // Format dates for display with safety checks
  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd MMM yyyy');
    } catch (e) {
      return date || 'N/A';
    }
  };

  // Debug logging
  console.log('[TokenStatus] Props:', {
    status,
    isEligible,
    hasPlayedInLastTenGames,
    hasRecentSelection,
    hasOutstandingPayments,
    outstandingPaymentsCount,
    recentGames
  });

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-200 shadow-xl p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <PiCoinDuotone size={24} className="text-gray-400" />
          <h3 className="text-lg font-bold">Priority Token Status</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      </motion.div>
    );
  }

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
            {whatsappGroupMember ? (
              <BsCheckCircle className="text-success" />
            ) : (
              <BsXCircle className="text-error" />
            )}
            <Tooltip content="Must be a member of the WhatsApp group">
              <span className={whatsappGroupMember ? "text-success" : "text-error"}>
                WhatsApp Member
              </span>
            </Tooltip>
          </div>
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
          <div className="flex items-center gap-2 mb-1">
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
          <div className="flex items-center gap-2">
            {hasOutstandingPayments ? (
              <BsXCircle className="text-error" />
            ) : (
              <BsCheckCircle className="text-success" />
            )}
            <Tooltip content="Must have no outstanding payments for previous games">
              <span className={!hasOutstandingPayments ? "text-success" : "text-error"}>
                No Outstanding Payments {outstandingPaymentsCount && outstandingPaymentsCount > 0 ? `(${outstandingPaymentsCount} unpaid)` : ''}
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

        {/* Recent Selections */}
        {hasRecentSelection && recentGames && recentGames.length > 0 && (
          <Tooltip content="You must not have been selected in any of the last 3 games to be eligible">
            <div className="text-sm text-error">
              Selected in: {recentGames.join(', ')}
            </div>
          </Tooltip>
        )}

        {/* Outstanding Payments - Show if ineligible due to outstanding payments */}
        {hasOutstandingPayments && (
          <Tooltip content="Has unpaid games">
            <div className="text-sm text-error/80">
              Outstanding payments: {outstandingPaymentsCount} unpaid {outstandingPaymentsCount === 1 ? 'game' : 'games'}
            </div>
          </Tooltip>
        )}

        {/* Eligibility Message */}
        {!isEligible && status !== 'AVAILABLE' && (
          <div className="text-sm mt-2">
            <p>To be eligible for a new token, you must:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {!whatsappGroupMember && (
                <li>Be a member of the WNF WhatsApp group</li>
              )}
              {!hasPlayedInLastTenGames && (
                <li>Play in at least one of the last 10 games</li>
              )}
              {hasRecentSelection && (
                <li>Not be selected in any of the last 3 games</li>
              )}
              {hasOutstandingPayments && (
                <li>Pay outstanding balance for {outstandingPaymentsCount} unpaid {outstandingPaymentsCount === 1 ? 'game' : 'games'}</li>
              )}
            </ul>
          </div>
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
