import { useState } from 'react';
import { format } from 'date-fns';
import { PiCoinDuotone } from "react-icons/pi";
import { BsCheckCircle, BsXCircle } from "react-icons/bs";
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

interface RecentGame {
  display: string;
  status: 'selected' | 'dropped_out';
}

interface TokenStatusProps {
  status: string;
  lastUsedAt?: string | null;
  nextTokenAt?: string | null;
  createdAt?: string;
  isEligible?: boolean;
  recentGames?: RecentGame[];
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
  const [explanationOpen, setExplanationOpen] = useState(false);

  // Format dates for display with safety checks
  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd MMM yyyy');
    } catch (e) {
      return date || 'N/A';
    }
  };

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
            <Tooltip content="Must not have been selected or dropped out in any of the last 3 games">
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
                No Outstanding Payments {hasOutstandingPayments && outstandingPaymentsCount && outstandingPaymentsCount > 0 ? `(${outstandingPaymentsCount} unpaid)` : ''}
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
          <Tooltip content="You must not have been selected or dropped out in any of the last 3 games to be eligible">
            <div className="text-sm text-error">
              {recentGames.map((game, index) => (
                <div key={game.display}>
                  {game.status === 'dropped_out' ? 'Dropped out in' : 'Selected in'}: {game.display}
                  {index < recentGames.length - 1 && ', '}
                </div>
              ))}
            </div>
          </Tooltip>
        )}

        {/* Outstanding Payments - Show if ineligible due to outstanding payments */}
        {hasOutstandingPayments && outstandingPaymentsCount && outstandingPaymentsCount > 0 && (
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
                <li>Not be selected or drop out in any of the last 3 games</li>
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

        {/* Expandable Explanation Section */}
        <div className="mt-2">
          <button
            onClick={() => setExplanationOpen(!explanationOpen)}
            className="btn btn-sm btn-outline w-full"
          >
            <PiCoinDuotone size={16} />
            {explanationOpen ? 'Hide' : 'What are Priority Tokens?'}
          </button>

          {explanationOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 p-3 bg-base-300 rounded-lg text-sm space-y-2"
            >
              <div>
                <h4 className="font-bold mb-1 flex items-center gap-1">
                  <PiCoinDuotone size={14} className="text-yellow-400" />
                  What are Priority Tokens?
                </h4>
                <p className="text-xs opacity-90">
                  Priority tokens give you a <strong>guaranteed slot</strong> in any game. They're designed for
                  casual players who want to join occasionally while maintaining priority for regular players
                  through the XP system.
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-1">How to Earn Them</h4>
                <p className="text-xs opacity-90">
                  Tokens are issued automatically when you meet all eligibility requirements shown above:
                </p>
                <ul className="text-xs opacity-90 list-disc list-inside space-y-1 mt-1">
                  <li>Be a member of the WhatsApp group</li>
                  <li>Played in at least 1 of the last 10 games</li>
                  <li>Not been selected or dropped out in any of the last 3 games</li>
                  <li>Have no outstanding payments</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-1">How to Use Them</h4>
                <p className="text-xs opacity-90">
                  When registering for a game, toggle the priority token option to guarantee your spot.
                  Your token will be consumed once the game completes.
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-1">Token Validity</h4>
                <p className="text-xs opacity-90">
                  Your eligibility is <strong>re-calculated every week</strong>. If you no longer meet the requirements
                  (e.g., you get selected for a game), your token will be removed.
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-1">Important Notes</h4>
                <ul className="text-xs opacity-90 list-disc list-inside space-y-1">
                  <li>You can only have <strong>one active token</strong> at a time</li>
                  <li>Tokens bypass the normal XP-based selection process</li>
                  <li>If you drop out or the game is cancelled, your token is returned</li>
                  <li><strong>Token Forgiveness:</strong> If your XP would have qualified you for selection anyway, your token is automatically returned</li>
                  <li><strong>Cooldown Effect:</strong> After using a token, you're de-prioritized in the next game's merit selection (bottom of the list)</li>
                  <li>You must meet eligibility criteria again to receive a new token after using one</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-1">💡 Strategy Tip</h4>
                <p className="text-xs opacity-90">
                  Save your token for games you really want to play! The token forgiveness system means if you're
                  a regular player with high XP, your token will be returned if you would have been selected anyway.
                  This makes tokens most valuable when your attendance has been spotty or when you're coming back
                  after missing several games.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
