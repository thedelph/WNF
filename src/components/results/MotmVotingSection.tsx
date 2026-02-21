/**
 * MotmVotingSection - Man of the Match voting for completed games
 * Collapsible section showing player grid for voting + results view
 * Follows HighlightsSection collapsible pattern
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, ChevronDown, ChevronUp, Check, LogIn } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMotmVotes } from '../../hooks/useMotmVotes';
import { useIsGameParticipant } from '../../hooks/useIsGameParticipant';
import { useAuth } from '../../context/AuthContext';
import { GameDetailRegistration } from '../../hooks/useGameDetail';
import { MotmVoteCounts } from '../../types/motm';

interface MotmVotingSectionProps {
  gameId: string;
  gameDate: string;
  registrations: GameDetailRegistration[];
}

export const MotmVotingSection: React.FC<MotmVotingSectionProps> = ({
  gameId,
  gameDate,
  registrations,
}) => {
  const { user } = useAuth();
  const { isParticipant, playerId } = useIsGameParticipant(registrations);
  const {
    votes,
    winner,
    voteCounts,
    userVote,
    totalVotes,
    isVotingOpen,
    castVote,
    removeVote,
    loading,
  } = useMotmVotes(gameId, gameDate, playerId);

  const [isExpanded, setIsExpanded] = useState(true);
  const [voting, setVoting] = useState(false);

  // Filter to only selected players
  const selectedRegistrations = useMemo(
    () => registrations.filter(r => r.status === 'selected'),
    [registrations]
  );

  // Need at least 2 participants
  if (selectedRegistrations.length < 2) return null;

  const blueTeam = selectedRegistrations.filter(r => r.team === 'blue');
  const orangeTeam = selectedRegistrations.filter(r => r.team === 'orange');

  const canVote = user && isParticipant && isVotingOpen;
  const hasVoted = userVote !== null;

  const handleVote = async (votedForPlayerId: string) => {
    if (voting || !canVote) return;
    if (votedForPlayerId === playerId) return; // Can't self-vote

    setVoting(true);
    const result = await castVote(votedForPlayerId);
    if (result.success) {
      toast.success(hasVoted ? 'Vote changed!' : 'Vote cast!');
    } else {
      toast.error(result.error || 'Failed to vote');
    }
    setVoting(false);
  };

  const handleRemoveVote = async () => {
    if (voting) return;
    setVoting(true);
    const result = await removeVote();
    if (result.success) {
      toast.success('Vote removed');
    } else {
      toast.error(result.error || 'Failed to remove vote');
    }
    setVoting(false);
  };

  // Show voting grid or results based on state
  const showVotingGrid = canVote && !hasVoted;
  const showResults = hasVoted || !isVotingOpen || !canVote;

  // Get players who received votes, sorted by count
  const rankedPlayers = useMemo(() => {
    return Object.entries(voteCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([pId, count]) => {
        const reg = selectedRegistrations.find(r => r.player.id === pId);
        return {
          playerId: pId,
          playerName: reg?.player.friendly_name || 'Unknown',
          avatarSvg: reg?.player.avatar_svg,
          team: reg?.team,
          voteCount: count,
        };
      });
  }, [voteCounts, selectedRegistrations]);

  const maxVotes = rankedPlayers.length > 0 ? rankedPlayers[0].voteCount : 0;

  return (
    <div className="space-y-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          Man of the Match
          {totalVotes > 0 && (
            <span className="badge badge-sm bg-yellow-500/15 text-yellow-600 border-yellow-500/30">
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
            </span>
          )}
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-base-content/50" />
        ) : (
          <ChevronDown className="w-5 h-5 text-base-content/50" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div className="space-y-2">
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Voting Grid - shown when user can vote and hasn't voted */}
                {showVotingGrid && (
                  <VotingGrid
                    blueTeam={blueTeam}
                    orangeTeam={orangeTeam}
                    currentPlayerId={playerId}
                    voteCounts={voteCounts}
                    onVote={handleVote}
                    disabled={voting}
                  />
                )}

                {/* Results View */}
                {showResults && rankedPlayers.length > 0 && (
                  <div className="space-y-3">
                    {/* Winner highlight */}
                    {winner && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <Crown className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                        {winner.avatarSvg && (
                          <img
                            src={winner.avatarSvg}
                            alt={winner.playerName}
                            className="w-8 h-8 rounded-full flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-yellow-600 truncate">{winner.playerName}</p>
                          <p className="text-xs text-base-content/50">
                            {winner.voteCount} vote{winner.voteCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* No clear winner (tie) */}
                    {!winner && totalVotes > 0 && (
                      <div className="text-center py-2 text-sm text-base-content/50">
                        Tied — no clear winner
                      </div>
                    )}

                    {/* Ranked list */}
                    <div className="space-y-2">
                      {rankedPlayers.map((player, index) => (
                        <div
                          key={player.playerId}
                          className={`flex items-center gap-3 p-2 rounded-lg ${
                            userVote === player.playerId
                              ? 'bg-primary/10 ring-1 ring-primary/30'
                              : 'bg-base-100'
                          }`}
                        >
                          <span className="text-sm font-mono text-base-content/40 w-6 text-right">
                            #{index + 1}
                          </span>
                          {player.avatarSvg && (
                            <img
                              src={player.avatarSvg}
                              alt={player.playerName}
                              className="w-6 h-6 rounded-full flex-shrink-0"
                            />
                          )}
                          <span className="text-sm flex-shrink-0 truncate max-w-[120px]">
                            {player.playerName}
                          </span>
                          {userVote === player.playerId && (
                            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          )}
                          <div className="flex-1 mx-2">
                            <div className="h-2 bg-base-300 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  player.team === 'blue' ? 'bg-blue-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${maxVotes > 0 ? (player.voteCount / maxVotes) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium text-base-content/70 flex-shrink-0">
                            {player.voteCount}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Change vote affordance */}
                    {canVote && hasVoted && (
                      <div className="flex items-center justify-between pt-2 border-t border-base-300">
                        <p className="text-xs text-base-content/40">
                          Click a player below to change your vote
                        </p>
                        <button
                          onClick={handleRemoveVote}
                          className="btn btn-ghost btn-xs"
                          disabled={voting}
                        >
                          Remove vote
                        </button>
                      </div>
                    )}

                    {/* Switch vote grid (compact) - shown when user has voted and can change */}
                    {canVote && hasVoted && (
                      <VotingGrid
                        blueTeam={blueTeam}
                        orangeTeam={orangeTeam}
                        currentPlayerId={playerId}
                        voteCounts={voteCounts}
                        userVote={userVote}
                        onVote={handleVote}
                        disabled={voting}
                        compact
                      />
                    )}
                  </div>
                )}

                {/* No votes yet */}
                {showResults && totalVotes === 0 && (
                  <div className="text-center py-6 text-base-content/50">
                    <Crown className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No votes cast yet</p>
                  </div>
                )}

                {/* Status messages */}
                {!isVotingOpen && totalVotes > 0 && (
                  <p className="text-xs text-center text-base-content/40">
                    Voting closed
                  </p>
                )}

                {!user && (
                  <p className="text-xs text-center text-base-content/50 flex items-center justify-center gap-1">
                    <LogIn className="w-3 h-3" />
                    Log in to vote
                  </p>
                )}

                {user && !isParticipant && isVotingOpen && (
                  <p className="text-xs text-center text-base-content/40">
                    Only game participants can vote
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Voting Grid ──────────────────────────────────────────────────────────────

interface VotingGridProps {
  blueTeam: GameDetailRegistration[];
  orangeTeam: GameDetailRegistration[];
  currentPlayerId: string | null;
  voteCounts: MotmVoteCounts;
  userVote?: string | null;
  onVote: (playerId: string) => void;
  disabled: boolean;
  compact?: boolean;
}

const VotingGrid: React.FC<VotingGridProps> = ({
  blueTeam,
  orangeTeam,
  currentPlayerId,
  voteCounts,
  userVote,
  onVote,
  disabled,
  compact,
}) => {
  const renderPlayer = (reg: GameDetailRegistration, teamColor: 'blue' | 'orange') => {
    const isSelf = reg.player.id === currentPlayerId;
    const isSelected = userVote === reg.player.id;

    return (
      <button
        key={reg.player.id}
        onClick={() => onVote(reg.player.id)}
        disabled={disabled || isSelf}
        className={`flex items-center gap-2 p-2 rounded-lg transition-all text-left w-full ${
          isSelf
            ? 'opacity-40 cursor-not-allowed bg-base-200'
            : isSelected
            ? 'ring-2 ring-primary bg-primary/10'
            : 'hover:bg-base-200 cursor-pointer'
        } ${compact ? 'py-1.5' : ''}`}
        title={isSelf ? 'Cannot vote for yourself' : `Vote for ${reg.player.friendly_name}`}
      >
        {reg.player.avatar_svg && !compact && (
          <img
            src={reg.player.avatar_svg}
            alt={reg.player.friendly_name}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
        )}
        <span className={`truncate flex-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          {reg.player.friendly_name}
        </span>
        {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
        {(voteCounts[reg.player.id] ?? 0) > 0 && (
          <span className="badge badge-xs badge-ghost">{voteCounts[reg.player.id]}</span>
        )}
      </button>
    );
  };

  return (
    <div className={`grid grid-cols-2 gap-3 ${compact ? 'gap-2' : ''}`}>
      {/* Blue Team Column */}
      <div>
        <div className={`flex items-center gap-1.5 mb-2 ${compact ? 'mb-1' : ''}`}>
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className={`font-medium text-blue-500 ${compact ? 'text-xs' : 'text-sm'}`}>Blue</span>
        </div>
        <div className="space-y-1">
          {blueTeam.map(reg => renderPlayer(reg, 'blue'))}
        </div>
      </div>

      {/* Orange Team Column */}
      <div>
        <div className={`flex items-center gap-1.5 mb-2 ${compact ? 'mb-1' : ''}`}>
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className={`font-medium text-orange-500 ${compact ? 'text-xs' : 'text-sm'}`}>Orange</span>
        </div>
        <div className="space-y-1">
          {orangeTeam.map(reg => renderPlayer(reg, 'orange'))}
        </div>
      </div>
    </div>
  );
};

export default MotmVotingSection;
