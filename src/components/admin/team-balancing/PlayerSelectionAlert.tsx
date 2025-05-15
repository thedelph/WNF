import React from 'react';
import { TeamAssignment } from './types';

interface PlayerSelectionAlertProps {
  selectedPlayer: string | null;
  assignments: TeamAssignment[];
  onCancelSelection: () => void;
}

/**
 * PlayerSelectionAlert component shows an alert when a player is selected for swapping
 * Provides instructions and a cancel button
 * @param selectedPlayer - ID of the selected player, or null if none selected
 * @param assignments - All player assignments
 * @param onCancelSelection - Callback to cancel the current selection
 */
export const PlayerSelectionAlert: React.FC<PlayerSelectionAlertProps> = ({
  selectedPlayer,
  assignments,
  onCancelSelection
}) => {
  // Don't render if no player is selected
  if (!selectedPlayer) return null;

  // Find the selected player in assignments
  const player = assignments.find(p => p.player_id === selectedPlayer);
  
  return (
    <div className="alert alert-info mb-4">
      <div className="flex justify-between w-full items-center">
        <span>
          Select another player to swap with{' '}
          <span className="font-semibold">{player?.friendly_name}</span>.
          {' '}The best swaps are highlighted and ranked.
        </span>
        <button 
          className="btn btn-ghost btn-sm"
          onClick={onCancelSelection}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
