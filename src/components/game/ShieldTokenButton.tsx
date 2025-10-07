import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Modal } from '../common/modals/Modal';
import { useShieldToken, useShieldEligibility } from '../../hooks/useShieldStatus';
import { supabase } from '../../utils/supabase';

interface ShieldTokenButtonProps {
  gameId: string;
  playerId: string;
  tokensAvailable: number;
  currentStreak: number;
  isRegistered: boolean;
  onShieldUsed?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ShieldTokenButton component
 * Button to use or cancel a shield token for a specific game
 *
 * Features:
 * - Toggles between "Use Shield" (🛡️ warning) and "Cancel Shield" (❌ error) modes
 * - Checks for active shield on mount and updates UI accordingly
 * - Use mode: Shows confirmation modal explaining consequences
 * - Cancel mode: Immediately returns token without confirmation
 * - Shows token count remaining after use/cancel
 *
 * @param gameId - UUID of the game
 * @param playerId - UUID of the player
 * @param tokensAvailable - Number of shield tokens available
 * @param currentStreak - Player's current streak value
 * @param isRegistered - Whether player is already registered
 * @param onShieldUsed - Callback function after successful shield use or cancellation
 * @param disabled - Whether button is disabled
 * @param size - Button size
 */
export const ShieldTokenButton: React.FC<ShieldTokenButtonProps> = ({
  gameId,
  playerId,
  tokensAvailable,
  currentStreak,
  isRegistered,
  onShieldUsed,
  disabled = false,
  size = 'md'
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasActiveShield, setHasActiveShield] = useState(false);
  const { eligibility } = useShieldEligibility(playerId, gameId);
  const { useShield, returnShield, isUsing } = useShieldToken(playerId, gameId);

  // Check if player has an active shield for this game
  useEffect(() => {
    const checkActiveShield = async () => {
      const { data, error } = await supabase
        .from('shield_token_usage')
        .select('id')
        .eq('player_id', playerId)
        .eq('game_id', gameId)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setHasActiveShield(true);
      } else {
        setHasActiveShield(false);
      }
    };

    checkActiveShield();
  }, [playerId, gameId]);

  const handleUseShield = async () => {
    try {
      const result = await useShield();

      toast.success(
        `Shield token used! ${result.tokensRemaining} shield${result.tokensRemaining !== 1 ? 's' : ''} remaining.`,
        { duration: 4000 }
      );

      setShowConfirmModal(false);
      setHasActiveShield(true);

      // Callback to refresh game data
      if (onShieldUsed) {
        onShieldUsed();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to use shield token');
    }
  };

  const handleCancelShield = async () => {
    try {
      const result = await returnShield();

      toast.success(
        `Shield cancelled! ${result.tokensNow} shield${result.tokensNow !== 1 ? 's' : ''} available.`,
        { duration: 4000 }
      );

      setHasActiveShield(false);

      // Callback to refresh game data
      if (onShieldUsed) {
        onShieldUsed();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel shield');
    }
  };

  const isEligible = eligibility?.eligible || false;
  const isDisabled = disabled || (!isEligible && !hasActiveShield) || (tokensAvailable === 0 && !hasActiveShield) || isUsing;

  // Calculate XP modifier
  const xpModifier = currentStreak * 10;

  // Button size classes
  const buttonSizeClass = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  }[size];

  // If shield is active, show cancel button instead
  if (hasActiveShield) {
    return (
      <motion.button
        whileHover={!isUsing ? { scale: 1.02 } : {}}
        whileTap={!isUsing ? { scale: 0.98 } : {}}
        onClick={handleCancelShield}
        disabled={isUsing || disabled}
        className={`btn btn-error ${buttonSizeClass} gap-2`}
      >
        <span className="text-xl">❌</span>
        <span>
          {isUsing ? 'Cancelling...' : 'Cancel Shield'}
        </span>
      </motion.button>
    );
  }

  return (
    <>
      <motion.button
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        onClick={() => setShowConfirmModal(true)}
        disabled={isDisabled}
        className={`btn btn-warning ${buttonSizeClass} gap-2 ${isDisabled ? 'btn-disabled' : ''}`}
      >
        <span className="text-xl">🛡️</span>
        <span>
          {isUsing ? 'Using Shield...' : 'Use Shield Token'}
        </span>
        {tokensAvailable > 0 && (
          <span className="badge badge-sm bg-warning-content text-warning">
            {tokensAvailable}
          </span>
        )}
      </motion.button>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="🛡️ Use Shield Token"
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {/* Warning Alert */}
          <div className="alert alert-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>You are about to protect your streak for this game</span>
          </div>

          {/* Explanation */}
          <div className="space-y-4">
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h3 className="card-title text-lg">What happens when you use a shield:</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    Your current <strong>{currentStreak}-game streak</strong> will be{' '}
                    <strong className="text-success">frozen</strong>
                  </li>
                  <li>
                    Your <strong>+{xpModifier}% XP modifier</strong> will remain active
                  </li>
                  <li>You will <strong>not be registered</strong> for this game</li>
                  <li>
                    The frozen streak stays active until you naturally reach{' '}
                    <strong>{currentStreak} consecutive games</strong> again
                  </li>
                  <li>
                    You will have <strong>{tokensAvailable - 1}</strong> shield
                    {tokensAvailable - 1 !== 1 ? 's' : ''} remaining
                  </li>
                </ul>
              </div>
            </div>

            {isRegistered && (
              <div className="alert alert-info">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="stroke-current shrink-0 w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span>
                  You are currently registered for this game. Using a shield will{' '}
                  <strong>automatically cancel your registration</strong>.
                </span>
              </div>
            )}

            {/* Important Note */}
            <div className="card bg-warning/10 border-2 border-warning">
              <div className="card-body p-4">
                <h4 className="font-bold text-warning">⚠️ Important:</h4>
                <p>
                  If you miss another game <strong>without using a shield</strong> before
                  reaching your frozen streak naturally, your shield protection will be{' '}
                  <strong>removed</strong> and your streak will <strong>reset to 0</strong>.
                </p>
              </div>
            </div>

            {/* How to Regain Streak */}
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h4 className="font-bold">How to regain your natural streak:</h4>
                <p>
                  Play <strong>{currentStreak} consecutive games</strong> without missing any
                  (or use more shields when you need to miss). Once you reach {currentStreak}{' '}
                  games naturally, the shield will be removed and you'll continue building
                  your streak normally.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="btn btn-ghost"
              disabled={isUsing}
            >
              Cancel
            </button>
            <button
              onClick={handleUseShield}
              className="btn btn-warning gap-2"
              disabled={isUsing}
            >
              {isUsing ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Using Shield...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">🛡️</span>
                  <span>Confirm - Use Shield Token</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

/**
 * Compact Shield Token Button
 * Minimal version for constrained layouts
 */
export const ShieldTokenButtonCompact: React.FC<{
  gameId: string;
  playerId: string;
  tokensAvailable: number;
  onShieldUsed?: () => void;
}> = ({ gameId, playerId, tokensAvailable, onShieldUsed }) => {
  const { useShield, isUsing } = useShieldToken(playerId, gameId);

  const handleQuickUse = async () => {
    if (!confirm('Use a shield token to protect your streak for this game?')) {
      return;
    }

    try {
      await useShield();
      toast.success('Shield token used!');
      if (onShieldUsed) onShieldUsed();
    } catch (error: any) {
      toast.error(error.message || 'Failed to use shield token');
    }
  };

  return (
    <button
      onClick={handleQuickUse}
      disabled={tokensAvailable === 0 || isUsing}
      className="btn btn-warning btn-sm btn-circle"
      title={`Use shield token (${tokensAvailable} available)`}
    >
      {isUsing ? <span className="loading loading-spinner loading-xs"></span> : '🛡️'}
    </button>
  );
};
