import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaUserClock, FaChevronDown, FaChevronRight, FaShieldAlt } from 'react-icons/fa';
import { PiCoinDuotone } from "react-icons/pi";
import { useAdminPermissions } from '../../../hooks/useAdminPermissions';
import { handlePlayerDropoutAndOffers } from '../../../utils/dropout';
import { toast } from 'react-hot-toast';
import { useUser } from '../../../hooks/useUser';
import { Tooltip } from '../../ui/Tooltip';

interface PlayerSectionProps {
  title: string;
  players: {
    id: string;
    friendly_name: string;
    avatar_svg?: string;
    xp: number;
    isRandomlySelected?: boolean;
    has_slot_offer?: boolean;
    using_token?: boolean;
    shieldActive?: boolean;
    frozenStreakValue?: number | null;
  }[];
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  allXpValues: number[];
}

interface PlayerListViewProps {
  selectedPlayers: {
    id: string;
    friendly_name: string;
    avatar_svg?: string;
    xp: number;
    isRandomlySelected?: boolean;
    has_slot_offer?: boolean;
    using_token?: boolean;
    shieldActive?: boolean;
    frozenStreakValue?: number | null;
  }[];
  reservePlayers: {
    id: string;
    friendly_name: string;
    avatar_svg?: string;
    xp: number;
    isRandomlySelected?: boolean;
    has_slot_offer?: boolean;
    using_token?: boolean;
    shieldActive?: boolean;
    frozenStreakValue?: number | null;
  }[];
  droppedOutPlayers: {
    id: string;
    friendly_name: string;
    avatar_svg?: string;
    xp: number;
    isRandomlySelected?: boolean;
    has_slot_offer?: boolean;
    using_token?: boolean;
    shieldActive?: boolean;
    frozenStreakValue?: number | null;
  }[];
  playerStats: Record<string, { xp: number }>;
}

const PlayerSection: React.FC<PlayerSectionProps> = ({
  title,
  players,
  icon: Icon,
  isExpanded,
  onToggle,
  allXpValues
}) => {
  const { player: currentPlayer } = useUser();
  if (players.length === 0) return null;

  return (
    <div>
      <button
        onClick={onToggle}
        className="btn btn-ghost btn-sm w-full flex justify-between items-center"
      >
        <span className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title} ({players.length})
        </span>
        {isExpanded ? (
          <FaChevronDown className="h-4 w-4" />
        ) : (
          <FaChevronRight className="h-4 w-4" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 space-y-2 overflow-hidden"
          >
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg bg-base-300 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{player.friendly_name}</span>
                  {player.id === currentPlayer?.id && (
                    <div className="badge badge-neutral badge-sm">You</div>
                  )}
                  {player.isRandomlySelected && (
                    <div className="badge badge-secondary badge-sm">Random Pick</div>
                  )}
                  {player.using_token && (
                    <Tooltip content="Using Priority Token">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <PiCoinDuotone size={24} className="text-yellow-400" />
                      </motion.div>
                    </Tooltip>
                  )}
                  {player.shieldActive && player.frozenStreakValue && (
                    <Tooltip content={`Shield Active - Protected streak: ${player.frozenStreakValue} games`}>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1"
                      >
                        <FaShieldAlt size={18} className="text-primary" />
                        <span className="text-xs text-primary font-medium">{player.frozenStreakValue}</span>
                      </motion.div>
                    </Tooltip>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="text-sm">
                    {player.xp} XP
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * List view component for displaying players in a more compact format
 * Shows selected, reserve, and dropped out players with their stats
 */
export const PlayerListView: React.FC<PlayerListViewProps> = ({
  selectedPlayers,
  reservePlayers,
  droppedOutPlayers,
  playerStats
}) => {
  const [showSelected, setShowSelected] = React.useState(true);
  const [showReserve, setShowReserve] = React.useState(true);
  const [showDroppedOut, setShowDroppedOut] = React.useState(false);

  // Sort selected players by token usage first, then by XP
  const sortedSelectedPlayers = [...selectedPlayers].sort((a, b) => {
    // First sort by token usage
    if (a.using_token !== b.using_token) {
      return a.using_token ? -1 : 1;
    }
    // Then by XP within each group (token users and non-token users)
    return (playerStats[b.id]?.xp || 0) - (playerStats[a.id]?.xp || 0);
  });

  // Sort reserve players by token usage first, then by XP
  const sortedReservePlayers = [...reservePlayers].sort((a, b) => {
    // First sort by token usage
    if (a.using_token !== b.using_token) {
      return a.using_token ? -1 : 1;
    }
    // Then by XP within each group (token users and non-token users)
    return (playerStats[b.id]?.xp || 0) - (playerStats[a.id]?.xp || 0);
  });

  // Sort dropped out players by token usage first, then by XP
  const sortedDroppedOutPlayers = [...droppedOutPlayers].sort((a, b) => {
    // First sort by token usage
    if (a.using_token !== b.using_token) {
      return a.using_token ? -1 : 1;
    }
    // Then by XP within each group (token users and non-token users)
    return (playerStats[b.id]?.xp || 0) - (playerStats[a.id]?.xp || 0);
  });

  return (
    <div className="space-y-4">
      {selectedPlayers.length > 0 && (
        <PlayerSection
          title="Selected Players"
          players={sortedSelectedPlayers}
          icon={FaUser}
          isExpanded={showSelected}
          onToggle={() => setShowSelected(!showSelected)}
          allXpValues={[]}
        />
      )}
      {reservePlayers.length > 0 && (
        <PlayerSection
          title="Reserve Players"
          players={sortedReservePlayers}
          icon={FaUserClock}
          isExpanded={showReserve}
          onToggle={() => setShowReserve(!showReserve)}
          allXpValues={[]}
        />
      )}
      {droppedOutPlayers.length > 0 && (
        <PlayerSection
          title="Dropped out Players"
          players={sortedDroppedOutPlayers}
          icon={FaUserClock}
          isExpanded={showDroppedOut}
          onToggle={() => setShowDroppedOut(!showDroppedOut)}
          allXpValues={[]}
        />
      )}
    </div>
  );
};
