import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SelectedPlayer } from '../../../types/game';
import { calculatePlayerXP } from '../../../utils/xpCalculations';
import { FaUser, FaUserClock } from 'react-icons/fa';

interface PlayerListViewProps {
  selectedPlayers: SelectedPlayer[];
  reservePlayers: SelectedPlayer[];
  droppedOutPlayers: SelectedPlayer[];
  currentUserId?: string;
  showSelected: boolean;
  showReserves: boolean;
  showDroppedOut: boolean;
  setShowSelected: (show: boolean) => void;
  setShowReserves: (show: boolean) => void;
  setShowDroppedOut: (show: boolean) => void;
  children?: (player: SelectedPlayer) => React.ReactNode;
}

interface PlayerSectionProps {
  title: string;
  players: {
    id: string;
    friendly_name: string;
    avatar_svg?: string;
    stats: any;
    isRandomlySelected?: boolean;
    has_slot_offer?: boolean;
  }[];
  icon: React.ComponentType;
  isExpanded: boolean;
  onToggle: () => void;
  currentUserId?: string;
  children?: (player: any) => React.ReactNode;
}

/**
 * PlayerSection component displays a collapsible section of players in list format
 */
const PlayerSection: React.FC<PlayerSectionProps> = ({
  title,
  players,
  icon: Icon,
  isExpanded,
  onToggle,
  currentUserId,
  children
}) => {
  // Sort players by XP
  const sortedPlayers = [...players].sort((a, b) => {
    const xpA = calculatePlayerXP(a.stats);
    const xpB = calculatePlayerXP(b.stats);
    return xpB - xpA;
  });

  return (
    <div className="w-full">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-base-200 rounded-t-lg hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <h3 className="text-xl font-semibold">{title}</h3>
          <span className="text-sm text-base-content/60">
            ({players.length} {players.length === 1 ? 'player' : 'players'})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-base-200 rounded-b-lg p-4">
              <ul className="space-y-2">
                {sortedPlayers.map((player) => (
                  <motion.li
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-base-300 hover:bg-base-300/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium flex items-center gap-2">
                        {player.friendly_name}
                        {player.id === currentUserId && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-content">
                            You
                          </span>
                        )}
                        {player.isRandomlySelected && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-secondary text-secondary-content">
                            Random Pick
                          </span>
                        )}
                        {player.has_slot_offer && (
                          <span className="badge badge-sm badge-info">
                            Slot Offered
                          </span>
                        )}
                        {children && children(player)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        XP: {calculatePlayerXP(player.stats)}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * PlayerListView component displays all player sections in a list format
 */
export const PlayerListView: React.FC<PlayerListViewProps> = ({
  selectedPlayers,
  reservePlayers,
  droppedOutPlayers,
  currentUserId,
  showSelected,
  showReserves,
  showDroppedOut,
  setShowSelected,
  setShowReserves,
  setShowDroppedOut,
  children
}) => {
  return (
    <div className="space-y-4">
      <PlayerSection
        title="Selected Players"
        players={selectedPlayers}
        icon={FaUser}
        isExpanded={showSelected}
        onToggle={() => setShowSelected(!showSelected)}
        currentUserId={currentUserId}
      />
      
      <PlayerSection
        title="Reserve Players"
        players={reservePlayers}
        icon={FaUserClock}
        isExpanded={showReserves}
        onToggle={() => setShowReserves(!showReserves)}
        currentUserId={currentUserId}
        children={children}
      />
      
      <PlayerSection
        title="Dropped Out Players"
        players={droppedOutPlayers}
        icon={FaUser}
        isExpanded={showDroppedOut}
        onToggle={() => setShowDroppedOut(!showDroppedOut)}
        currentUserId={currentUserId}
      />
    </div>
  );
};
