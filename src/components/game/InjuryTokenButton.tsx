import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Modal } from '../common/modals/Modal';
import { useInjuryToken, useInjuryTokenEligibility } from '../../hooks/useInjuryTokenStatus';

interface InjuryTokenButtonProps {
  gameId: string;
  playerId: string;
  currentStreak: number;
  onInjuryClaimed?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * InjuryTokenButton component
 * Button to claim an injury token for a specific game where player got injured
 *
 * Features:
 * - Shows confirmation modal explaining the injury token system
 * - Calculates and displays return streak (50% of original)
 * - Fair-use policy warning
 * - Checks eligibility (player must have been selected for the game)
 *
 * @param gameId - UUID of the game where injury occurred
 * @param playerId - UUID of the player
 * @param currentStreak - Player's current streak value
 * @param onInjuryClaimed - Callback after successful claim
 * @param disabled - Whether button is disabled
 * @param size - Button size
 */
export const InjuryTokenButton: React.FC<InjuryTokenButtonProps> = ({
  gameId,
  playerId,
  currentStreak,
  onInjuryClaimed,
  disabled = false,
  size = 'md'
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notes, setNotes] = useState('');
  const { eligibility, loading: checkingEligibility } = useInjuryTokenEligibility(playerId, gameId);
  const { activateInjuryToken, isProcessing } = useInjuryToken();

  const handleClaimInjury = async () => {
    try {
      const result = await activateInjuryToken(playerId, gameId, notes || undefined);

      toast.success(
        `Injury token claimed! Your streak will be ${result.returnStreak} games when you return.`,
        { duration: 5000 }
      );

      setShowConfirmModal(false);
      setNotes('');

      if (onInjuryClaimed) {
        onInjuryClaimed();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim injury token');
    }
  };

  const isEligible = eligibility?.eligible ?? false;
  const returnStreak = eligibility?.returnStreak ?? Math.ceil(currentStreak / 2);
  const effectiveStreak = eligibility?.effectiveStreak ?? currentStreak;
  const hasActiveShield = eligibility?.hasActiveShield ?? false;
  const eligibilityReason = eligibility?.reason ?? '';

  const isDisabled = disabled || !isEligible || isProcessing || checkingEligibility;

  // Button size classes
  const buttonSizeClass = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  }[size];

  // If not eligible, show disabled button with reason
  if (!isEligible && !checkingEligibility) {
    return (
      <div className="tooltip tooltip-bottom" data-tip={eligibilityReason || 'Not eligible for injury token'}>
        <button
          disabled
          className={`btn btn-warning btn-outline ${buttonSizeClass} gap-2 btn-disabled opacity-50`}
        >
          <span className="text-xl">🩹</span>
          <span>Claim Injury Token</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <motion.button
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        onClick={() => setShowConfirmModal(true)}
        disabled={isDisabled}
        className={`btn btn-warning btn-outline ${buttonSizeClass} gap-2 ${isDisabled ? 'btn-disabled' : ''}`}
      >
        <span className="text-xl">🩹</span>
        <span>
          {checkingEligibility ? 'Checking...' : isProcessing ? 'Claiming...' : 'Claim Injury Token'}
        </span>
      </motion.button>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="🩹 Claim Injury Token"
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {/* Fair Use Warning */}
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
            <div>
              <p className="font-bold">Fair-use policy applies</p>
              <p className="text-sm">Only use for injuries that occurred during a WNF game</p>
            </div>
          </div>

          {/* Streak Information */}
          <div className="stats bg-base-200 w-full">
            <div className="stat">
              <div className="stat-title">Current Streak</div>
              <div className="stat-value text-2xl">{effectiveStreak}</div>
              {hasActiveShield && (
                <div className="stat-desc text-purple-400">Includes shield protection</div>
              )}
            </div>
            <div className="stat">
              <div className="stat-title">Return Streak</div>
              <div className="stat-value text-2xl text-warning">{returnStreak}</div>
              <div className="stat-desc">50% of original</div>
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-4">
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h3 className="card-title text-lg">What happens when you claim:</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    Your <strong>{effectiveStreak}-game streak</strong> is recorded
                  </li>
                  <li>
                    You go on <strong className="text-amber-400">injury reserve</strong>
                  </li>
                  <li>
                    When you return, your streak will be{' '}
                    <strong className="text-warning">{returnStreak} games</strong>
                  </li>
                  <li>
                    You can then <strong>build up from there</strong>
                  </li>
                </ul>
              </div>
            </div>

            {/* How it differs from Shield */}
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <span className="text-purple-400">🛡️</span>
                  vs
                  <span className="text-amber-400">🩹</span>
                  What's the difference?
                </h4>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th></th>
                        <th className="text-purple-400">Shield 🛡️</th>
                        <th className="text-amber-400">Injury 🩹</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Use for</td>
                        <td>Planned absences</td>
                        <td>WNF injuries</td>
                      </tr>
                      <tr>
                        <td>Return value</td>
                        <td>Higher → decays</td>
                        <td>Lower → builds up</td>
                      </tr>
                      <tr>
                        <td>Best for</td>
                        <td>1-2 week breaks</td>
                        <td>3+ week injuries</td>
                      </tr>
                      <tr>
                        <td>Cost</td>
                        <td>Uses earned token</td>
                        <td>Free</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {hasActiveShield && (
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
                  You have an active shield. Claiming an injury token will{' '}
                  <strong>use your effective streak ({effectiveStreak} games)</strong> and
                  clear the shield protection.
                </span>
              </div>
            )}

            {/* Optional Notes */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Notes (optional)</legend>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="e.g., Twisted ankle during match"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </fieldset>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="btn btn-ghost"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleClaimInjury}
              className="btn btn-warning gap-2"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Claiming...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">🩹</span>
                  <span>Confirm - Claim Injury Token</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default InjuryTokenButton;
