import React, { useState } from 'react';
import { FaTimes, FaUserMinus, FaShieldAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../utils/supabase';
import { toast } from 'react-hot-toast';

interface PlayerActionMenuProps {
  registrationId: string;
  playerId: string;
  playerName: string;
  gameId: string;
  currentStatus: string;
  shieldTokensAvailable: number;
  onActionComplete: () => void;
}

export const PlayerActionMenu: React.FC<PlayerActionMenuProps> = ({
  registrationId,
  playerId,
  playerName,
  gameId,
  currentStatus,
  shieldTokensAvailable,
  onActionComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'unregister' | 'dropout' | 'dropout_shield' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUnregister = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('game_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      toast.success(`${playerName} unregistered successfully`);
      onActionComplete();
    } catch (error: any) {
      toast.error(`Failed to unregister: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setIsConfirmOpen(false);
      setIsOpen(false);
    }
  };

  const handleDropout = async (useShield: boolean) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('dropout_with_shield', {
        p_player_id: playerId,
        p_game_id: gameId,
        p_use_shield: useShield,
        p_admin_id: 'admin',
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onActionComplete();
    } catch (error: any) {
      toast.error(`Failed to process dropout: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setIsConfirmOpen(false);
      setIsOpen(false);
    }
  };

  const openConfirmDialog = (action: 'unregister' | 'dropout' | 'dropout_shield') => {
    setConfirmAction(action);
    setIsConfirmOpen(true);
  };

  const executeConfirmedAction = () => {
    switch (confirmAction) {
      case 'unregister':
        handleUnregister();
        break;
      case 'dropout':
        handleDropout(false);
        break;
      case 'dropout_shield':
        handleDropout(true);
        break;
    }
  };

  const getConfirmationMessage = () => {
    switch (confirmAction) {
      case 'unregister':
        return `Remove ${playerName}'s registration entirely? This deletes their registration record.`;
      case 'dropout':
        return `Mark ${playerName} as dropped out? Their streak will be broken when the game completes.`;
      case 'dropout_shield':
        return `Mark ${playerName} as dropped out and use their shield token? Their streak will be protected with gradual decay. They have ${shieldTokensAvailable} token(s) available.`;
      default:
        return '';
    }
  };

  // Don't show menu for already dropped out players
  if (currentStatus === 'dropped_out') {
    return (
      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">
        Dropped Out
      </span>
    );
  }

  return (
    <div className="relative">
      {/* Menu trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost btn-sm px-2 hover:bg-base-200"
        aria-label="Player actions"
        title="Actions"
      >
        <span className="text-lg font-bold">⋮</span>
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close menu */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 z-50 bg-base-100 rounded-lg shadow-xl border border-base-300 min-w-[200px] overflow-hidden"
            >
              <div className="p-1">
                {/* Unregister option */}
                <button
                  onClick={() => openConfirmDialog('unregister')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded text-left"
                >
                  <FaTimes className="w-4 h-4 text-gray-500" />
                  <span>Unregister</span>
                </button>

                <div className="border-t border-base-300 my-1" />

                {/* Drop out option */}
                <button
                  onClick={() => openConfirmDialog('dropout')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-error/10 rounded text-left text-error"
                >
                  <FaUserMinus className="w-4 h-4" />
                  <div>
                    <span>Drop Out</span>
                    <span className="block text-xs opacity-70">Streak will break</span>
                  </div>
                </button>

                {/* Drop out with shield option - only if player has shields */}
                {shieldTokensAvailable > 0 && (
                  <button
                    onClick={() => openConfirmDialog('dropout_shield')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-warning/10 rounded text-left text-warning"
                  >
                    <FaShieldAlt className="w-4 h-4" />
                    <div>
                      <span>Drop Out + Use Shield</span>
                      <span className="block text-xs opacity-70">
                        {shieldTokensAvailable} token{shieldTokensAvailable !== 1 ? 's' : ''} available
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {isConfirmOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => !isProcessing && setIsConfirmOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-base-100 rounded-lg shadow-2xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold mb-4">Confirm Action</h3>
                <p className="text-sm opacity-80 mb-6">{getConfirmationMessage()}</p>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsConfirmOpen(false)}
                    className="btn btn-ghost"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeConfirmedAction}
                    className={`btn ${
                      confirmAction === 'dropout_shield'
                        ? 'btn-warning'
                        : confirmAction === 'dropout'
                        ? 'btn-error'
                        : 'btn-primary'
                    }`}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      'Confirm'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
