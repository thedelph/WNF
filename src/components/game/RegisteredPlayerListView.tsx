import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PiCoinDuotone } from "react-icons/pi";
import { MdPauseCircle } from "react-icons/md";
import { FaCircle } from "react-icons/fa";
import { Registration } from '../../types/playerSelection';
import { useUser } from '../../hooks/useUser';
import { Tooltip } from '../ui/Tooltip';
import { toUrlFriendly } from '../../utils/urlHelpers';
import { calculateSelectionOdds, formatOdds, getOddsColorClass } from '../../utils/selectionOdds';

interface RegisteredPlayerListViewProps {
  registrations: Registration[];
  playerStats: Record<string, any>;
  stats: Record<string, any>;
  xpSlots: number;
  tokenCooldownPlayerIds?: Set<string>;
  maxPlayers?: number;
  unregisteredTokenHoldersCount?: number;
  unregisteredPlayersXP?: number[];
}

/**
 * List view component for displaying registered players in a compact format
 * Shows player names and XP in a card layout with responsive design
 */
export const RegisteredPlayerListView: React.FC<RegisteredPlayerListViewProps> = ({
  registrations,
  playerStats,
  stats,
  xpSlots,
  tokenCooldownPlayerIds = new Set(),
  maxPlayers = 18,
  unregisteredTokenHoldersCount = 0,
  unregisteredPlayersXP = [],
}) => {
  const { player: currentPlayer } = useUser();

  // State for collapsible sections
  const [guaranteedOpen, setGuaranteedOpen] = useState(true);
  const [atRiskOpen, setAtRiskOpen] = useState(true);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // Sort players to reflect selection order: Token users first, then regular players, then token cooldown players (all by XP)
  const sortedRegistrations = [...registrations].sort((a, b) => {
    const aXp = playerStats[a.player.id]?.xp || 0;
    const bXp = playerStats[b.player.id]?.xp || 0;
    const aOnCooldown = tokenCooldownPlayerIds.has(a.player.id);
    const bOnCooldown = tokenCooldownPlayerIds.has(b.player.id);

    // Priority 1: Token users come first
    if (a.using_token !== b.using_token) {
      return a.using_token ? -1 : 1;
    }

    // Priority 2: Within non-token users, cooldown players go to bottom
    if (!a.using_token && !b.using_token && aOnCooldown !== bOnCooldown) {
      return aOnCooldown ? 1 : -1;
    }

    // Priority 3: Within same category, sort by XP (highest first)
    return bXp - aXp;
  });

  // Count only tokens used by players who wouldn't make it on XP alone
  const tokensAffectingCutoff = sortedRegistrations
    .filter((reg, index) => {
      // If using token and would NOT make it on XP alone (index >= xpSlots)
      return reg.using_token && index >= xpSlots;
    })
    .length;

  // Adjust XP slots based on tokens that affect the cutoff
  const adjustedXpSlots = xpSlots - tokensAffectingCutoff;

  // Only show zone indicators if there are more registrations than max players
  const showZoneIndicators = sortedRegistrations.length > maxPlayers;

  // Calculate selection odds for all players
  const randomSlots = maxPlayers - xpSlots;
  const selectionOdds = calculateSelectionOdds(
    sortedRegistrations,
    playerStats,
    tokenCooldownPlayerIds,
    xpSlots,
    randomSlots,
    maxPlayers,
    unregisteredTokenHoldersCount,
    unregisteredPlayersXP
  );

  // Group players by their selection status (mutually exclusive)
  const guaranteedPlayers = sortedRegistrations.filter(reg => {
    const odds = selectionOdds.get(reg.player.id);
    return odds && odds.percentage === 100 && odds.status !== 'random';
  });

  const atRiskMeritPlayers = sortedRegistrations.filter(reg => {
    const odds = selectionOdds.get(reg.player.id);
    return odds && odds.percentage > 0 && odds.percentage < 100 && odds.status === 'merit';
  });

  const randomSelectionPlayers = sortedRegistrations
    .filter(reg => {
      const odds = selectionOdds.get(reg.player.id);
      return odds && odds.status === 'random';
    })
    .sort((a, b) => {
      const aOdds = selectionOdds.get(a.player.id)?.percentage || 0;
      const bOdds = selectionOdds.get(b.player.id)?.percentage || 0;
      return bOdds - aOdds; // Sort by odds descending (highest first)
    });

  // Helper function to render a player row
  const renderPlayerRow = (registration: Registration, showOdds: boolean = false) => {
    const xp = playerStats[registration.player.id]?.xp || 0;
    const benchWarmerStreak = playerStats[registration.player.id]?.benchWarmerStreak || 0;

    // Get odds for this player
    const odds = selectionOdds.get(registration.player.id);

    // Calculate selection points for random zone (1 base + bench warmer streak)
    const selectionPoints = 1 + benchWarmerStreak;
    const isInRandomZone = odds?.status === 'random';

    return (
      <motion.div
        key={registration.player.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex items-center justify-between rounded-lg ${registration.using_token ? 'bg-base-200' : 'bg-base-300'} p-3 hover:bg-base-200 transition-colors`}
      >
        <Link
          to={`/player/${toUrlFriendly(registration.player.friendly_name)}`}
          className="text-blue-500 hover:text-blue-600 flex-1"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="font-medium hover:text-primary">
                {registration.player.friendly_name}
              </span>
              {registration.player.id === currentPlayer?.id && (
                <span className="badge badge-sm badge-primary">You</span>
              )}
              {registration.using_token && (
                <Tooltip content="Using Priority Token">
                  <PiCoinDuotone size={16} className="text-yellow-400" />
                </Tooltip>
              )}
              {tokenCooldownPlayerIds.has(registration.player.id) && (
                <Tooltip content="Token Cooldown - used token in previous game">
                  <MdPauseCircle size={18} className="text-warning" />
                </Tooltip>
              )}
              {/* Show selection points for players in random zone */}
              {isInRandomZone && selectionPoints > 0 && (
                <Tooltip content={`${selectionPoints} selection ${selectionPoints === 1 ? 'point' : 'points'} (1 base${benchWarmerStreak > 0 ? ` + ${benchWarmerStreak} reserve streak` : ''})`}>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: selectionPoints }).map((_, i) => (
                      <FaCircle
                        key={i}
                        size={8}
                        className={`${
                          odds.percentage >= 85
                            ? 'text-info'
                            : odds.percentage >= 50
                            ? 'text-warning'
                            : 'text-error'
                        }`}
                      />
                    ))}
                  </div>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-base-content/70">{xp.toLocaleString()} XP</span>
              {showOdds && odds && (
                <Tooltip content={odds.description}>
                  <span className={`badge badge-sm font-bold text-white shadow-lg ${
                    odds.percentage === 100
                      ? 'bg-success border-success'
                      : odds.percentage >= 85
                      ? 'bg-info border-info'
                      : odds.percentage >= 50
                      ? 'bg-warning border-warning'
                      : 'bg-error border-error'
                  }`}>
                    {formatOdds(odds)}
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="container mx-auto space-y-6">
      {/* Player Breakdown Summary */}
      <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="stat-title">Guaranteed</div>
          <div className="stat-value text-success">{guaranteedPlayers.length}</div>
          <div className="stat-desc">Players certain to be selected</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="stat-title">At Risk</div>
          <div className="stat-value text-warning">{atRiskMeritPlayers.length + randomSelectionPlayers.length}</div>
          <div className="stat-desc">Players with uncertain selection</div>
        </div>
      </div>

      {/* Reserve System Info Banner */}
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <h3 className="font-bold">Reserve System</h3>
          <div className="text-sm">Players who aren't selected will be placed on the reserve list (ranked by XP) and earn Reserve XP for registering on time.</div>
        </div>
      </div>

      {/* Guaranteed Section */}
      {guaranteedPlayers.length > 0 && (
        <div className="collapse collapse-arrow bg-base-200">
          <input
            type="checkbox"
            checked={guaranteedOpen}
            onChange={() => setGuaranteedOpen(!guaranteedOpen)}
          />
          <div className="collapse-title flex items-center gap-3">
            <div className="badge badge-success badge-lg gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              GUARANTEED
            </div>
            <span className="text-sm text-base-content/60">{guaranteedPlayers.length} {guaranteedPlayers.length === 1 ? 'player' : 'players'}</span>
          </div>
          <div className="collapse-content">
            <div className="space-y-2 pt-4">
              {guaranteedPlayers.map(reg => renderPlayerRow(reg))}
            </div>
          </div>
        </div>
      )}

      {/* At Risk Section */}
      {(atRiskMeritPlayers.length > 0 || randomSelectionPlayers.length > 0) && (
        <div className="collapse collapse-arrow bg-base-200">
          <input
            type="checkbox"
            checked={atRiskOpen}
            onChange={() => setAtRiskOpen(!atRiskOpen)}
          />
          <div className="collapse-title flex items-center gap-3">
            <div className="badge badge-warning badge-lg gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              AT RISK
            </div>
            <span className="text-sm text-base-content/60">{atRiskMeritPlayers.length + randomSelectionPlayers.length} {atRiskMeritPlayers.length + randomSelectionPlayers.length === 1 ? 'player' : 'players'}</span>
          </div>
          <div className="collapse-content">
            <div className="space-y-5 pt-4">
              {/* Disclaimer */}
              <div className="alert alert-warning">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <div className="text-sm">
                  These players are at risk because unregistered players with higher XP or priority tokens could register and push them down the selection order.
                </div>
              </div>

              {/* At Risk - Merit Zone */}
              {atRiskMeritPlayers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-base-content/70 pl-4 border-l-4 border-warning">
                    Merit Zone - At Risk of Being Pushed to Random Selection
                  </div>
                  <div className="space-y-2">
                    {atRiskMeritPlayers.map(reg => renderPlayerRow(reg))}
                  </div>
                </div>
              )}

              {/* The Randomiser */}
              {randomSelectionPlayers.length > 0 && (
                <div className="space-y-2">
                  <div className="card bg-error/10 border-2 border-error/50">
                    <div className="card-body p-4">
                      <div className="text-lg font-bold text-error flex items-center gap-2">
                        <span className="text-3xl">🎲</span>
                        THE RANDOMISER
                        <span className="text-3xl">🎲</span>
                      </div>
                      <div className="text-sm text-base-content mt-2 space-y-2">
                        <div>
                          {randomSlots} {randomSlots === 1 ? 'player' : 'players'} will be randomly selected from the {randomSelectionPlayers.length} {randomSelectionPlayers.length === 1 ? 'player' : 'players'} below.
                        </div>
                        <div className="bg-base-200/50 rounded">
                          <button
                            onClick={() => setHowItWorksOpen(!howItWorksOpen)}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold hover:bg-base-200/70 transition-colors"
                          >
                            <span>How It Works</span>
                            <svg
                              className={`w-3 h-3 transition-transform ${howItWorksOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {howItWorksOpen && (
                            <div className="px-3 pb-2 space-y-1">
                              <div className="text-xs">Each coloured circle (●) represents a selection point. Players get 1 base point + bonus points for recent <b>consecutive</b> games as reserve. More circles = better odds!</div>
                              <div className="text-xs opacity-70">Example: ● ● ● (3 points) = 1 base + 2 reserve streak</div>
                            </div>
                          )}
                        </div>
                        <div className="italic text-xs opacity-70">Note: Selection odds shown are based on <b>current</b> registrations and will change if more players sign up.</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {randomSelectionPlayers.map(reg => renderPlayerRow(reg, true))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
