import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShieldAlt, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';

interface DropoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  gameId: string;
  currentStreak: number;
  shieldTokensAvailable: number;
  onDropoutComplete: () => void;
}

// XP System v2 - Diminishing returns streak bonus calculation
const calculateStreakBonus = (streak: number): number => {
  if (streak <= 0) return 0;
  if (streak <= 10) {
    // Sum formula: 10 + 9 + 8 + ... + (11 - streak)
    return (streak * 11 - (streak * (streak + 1)) / 2) / 100;
  }
  // After 10 games: +1% per game
  return (55 + (streak - 10)) / 100;
};

export const DropoutConfirmModal: React.FC<DropoutConfirmModalProps> = ({
  isOpen,
  onClose,
  playerId,
  playerName,
  gameId,
  currentStreak,
  shieldTokensAvailable,
  onDropoutComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [useShield, setUseShield] = useState(shieldTokensAvailable > 0);

  // Calculate XP bonus percentage using v2 formula
  const streakBonusPercent = Math.round(calculateStreakBonus(currentStreak) * 100);

  const handleDropout = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('dropout_with_shield', {
        p_player_id: playerId,
        p_game_id: gameId,
        p_use_shield: useShield,
        p_admin_id: null, // Player-initiated
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onDropoutComplete();
      onClose();
    } catch (error: any) {
      toast.error(`Failed to process dropout: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="dropout-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <motion.div
        key="dropout-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-base-100 rounded-lg shadow-2xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FaExclamationTriangle className="text-warning" />
              Drop Out of Game
            </h3>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-square"
              disabled={isProcessing}
            >
              <FaTimes />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Current streak info */}
            <div className="bg-base-200 rounded-lg p-4">
              <div className="text-sm opacity-70 mb-1">Your current streak</div>
              <div className="text-2xl font-bold">{currentStreak} games</div>
              <div className="text-sm opacity-70">
                +{streakBonusPercent}% XP bonus
              </div>
            </div>

            {/* Shield option */}
            {shieldTokensAvailable > 0 ? (
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useShield}
                    onChange={(e) => setUseShield(e.target.checked)}
                    className="checkbox checkbox-primary mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <FaShieldAlt className="text-primary" />
                      Use Shield Token
                    </div>
                    <p className="text-sm opacity-70 mt-1">
                      Protect your streak with gradual decay. You have{' '}
                      <span className="font-bold">{shieldTokensAvailable}</span>{' '}
                      token{shieldTokensAvailable !== 1 ? 's' : ''} available.
                    </p>
                  </div>
                </label>

                {/* Shield explanation */}
                {useShield && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-primary/10 rounded-lg p-3 text-sm"
                  >
                    <p className="font-medium text-primary mb-2">
                      Shield Protection Active
                    </p>
                    <ul className="list-disc list-inside space-y-1 opacity-80">
                      <li>Your {currentStreak}-game streak will be protected</li>
                      <li>XP bonus decays gradually when you return</li>
                      <li>Full protection restored at {Math.ceil(currentStreak / 2)} games</li>
                    </ul>
                  </motion.div>
                )}

                {/* Warning if not using shield */}
                {!useShield && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-error/10 rounded-lg p-3 text-sm"
                  >
                    <p className="font-medium text-error mb-2">
                      Streak Will Be Lost
                    </p>
                    <p className="opacity-80">
                      Without a shield, your {currentStreak}-game streak will reset
                      to 0 when the game completes. You'll lose your +{streakBonusPercent}% XP bonus.
                    </p>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="bg-error/10 rounded-lg p-4">
                <div className="flex items-center gap-2 font-medium text-error mb-2">
                  <FaExclamationTriangle />
                  No Shield Tokens Available
                </div>
                <p className="text-sm opacity-80">
                  Your {currentStreak}-game streak will reset to 0 when the game
                  completes. You'll lose your +{streakBonusPercent}% XP bonus.
                </p>
                <p className="text-xs opacity-60 mt-2">
                  Shield tokens are earned by playing 10 games.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t border-base-300">
            <button
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleDropout}
              className={`btn ${useShield ? 'btn-warning' : 'btn-error'}`}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="loading loading-spinner loading-sm" />
              ) : useShield ? (
                <>
                  <FaShieldAlt className="mr-1" />
                  Drop Out with Shield
                </>
              ) : (
                'Drop Out'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
