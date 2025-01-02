import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaUserClock, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { useAdminPermissions } from '../../../hooks/useAdminPermissions';
import { handlePlayerDropoutAndOffers } from '../../../utils/dropout';
import { toast } from 'react-hot-toast';
import { useUser } from '../../../hooks/useUser';

interface PlayerSectionProps {
  title: string;
  players: {
    id: string;
    friendly_name: string;
    avatar_svg?: string;
    xp: number;
    isRandomlySelected?: boolean;
    has_slot_offer?: boolean;
  }[];
  icon: React.ComponentType;
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
  }[];
  reservePlayers: {
    id: string;
    friendly_name: string;
    avatar_svg?: string;
    xp: number;
    isRandomlySelected?: boolean;
    has_slot_offer?: boolean;
  }[];
  droppedOutPlayers: {
    id: string;
    friendly_name: string;
    avatar_svg?: string;
    xp: number;
    isRandomlySelected?: boolean;
    has_slot_offer?: boolean;
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
  const [showReserves, setShowReserves] = React.useState(true);
  const [showDroppedOut, setShowDroppedOut] = React.useState(false);

  return (
    <div className="space-y-4">
      {selectedPlayers.length > 0 && (
        <PlayerSection
          title="Selected players"
          players={selectedPlayers}
          icon={FaUser}
          isExpanded={showSelected}
          onToggle={() => setShowSelected(!showSelected)}
          allXpValues={[]}
        />
      )}
      {reservePlayers.length > 0 && (
        <PlayerSection
          title="Reserve players"
          players={reservePlayers}
          icon={FaUserClock}
          isExpanded={showReserves}
          onToggle={() => setShowReserves(!showReserves)}
          allXpValues={[]}
        />
      )}
      {droppedOutPlayers.length > 0 && (
        <PlayerSection
          title="Dropped out players"
          players={droppedOutPlayers}
          icon={FaUserClock}
          isExpanded={showDroppedOut}
          onToggle={() => setShowDroppedOut(!showDroppedOut)}
          allXpValues={[]}
        />
      )}
    </div>
  );
};
