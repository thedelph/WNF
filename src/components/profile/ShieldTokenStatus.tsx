import { useState } from 'react';
import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

interface ShieldTokenStatusProps {
  tokensAvailable: number;
  gamesTowardNextToken: number;
  gamesUntilNextToken: number;
  shieldActive: boolean;
  frozenStreakValue: number | null;
  isLoading?: boolean;
  playerName?: string;
}

// Component to display shield token status with progress tracker and explanation
export default function ShieldTokenStatus({
  tokensAvailable,
  gamesTowardNextToken,
  gamesUntilNextToken,
  shieldActive,
  frozenStreakValue,
  isLoading = false,
  playerName,
}: ShieldTokenStatusProps) {
  const [explanationOpen, setExplanationOpen] = useState(false);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-200 shadow-xl p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield size={24} className="text-gray-400" />
          <h3 className="text-lg font-bold">Shield Token Status</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      </motion.div>
    );
  }

  const maxTokens = 4;
  const progressPercentage = (gamesTowardNextToken / 10) * 100;
  const hasTokens = tokensAvailable > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-200 shadow-xl p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Shield
          size={24}
          className={hasTokens ? 'text-purple-500' : 'text-gray-400'}
        />
        <h3 className="text-lg font-bold">Shield Token Status</h3>
      </div>

      <div className="flex flex-col gap-3">
        {/* Token Count Display */}
        <Tooltip content={playerName ? `${playerName}'s available shield tokens` : "Your available shield tokens for streak protection"}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Shield Tokens:</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {tokensAvailable}/{maxTokens}
              </span>
              <span className="text-lg">🛡️</span>
            </div>
          </div>
        </Tooltip>

        {/* Active Shield Indicator */}
        {shieldActive && (
          <Tooltip content={`Shield protecting ${frozenStreakValue || 0} game streak`}>
            <div className="badge badge-success gap-2 w-full justify-center py-3">
              <Shield size={14} />
              <span className="font-medium">
                SHIELD ACTIVE - Protecting {frozenStreakValue || 0} game streak
              </span>
            </div>
          </Tooltip>
        )}

        {/* Progress Toward Next Token */}
        {tokensAvailable >= maxTokens ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress to Next Token:</span>
              <span className="text-xs opacity-75">-</span>
            </div>
            <div className="alert alert-warning py-2">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium">
                  Maximum tokens reached ({maxTokens}/{maxTokens})
                </p>
                <p className="text-xs opacity-90">
                  Use a token to start earning your next one
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Tooltip content="Play 10 games to earn your next shield token">
                <span className="font-medium">Progress to Next Token:</span>
              </Tooltip>
              <span className="text-xs opacity-75">
                {gamesTowardNextToken}/10 games
              </span>
            </div>

            <Tooltip content={`${gamesUntilNextToken} more ${gamesUntilNextToken === 1 ? 'game' : 'games'} until next shield token`}>
              <div className="w-full">
                <progress
                  className="progress progress-warning w-full"
                  value={progressPercentage}
                  max="100"
                />
              </div>
            </Tooltip>

            {gamesUntilNextToken > 0 && (
              <p className="text-xs opacity-75 text-center">
                {gamesUntilNextToken} {gamesUntilNextToken === 1 ? 'game' : 'games'} until next token
              </p>
            )}
          </div>
        )}

        {/* Expandable Explanation Section */}
        <div className="mt-2">
          <button
            onClick={() => setExplanationOpen(!explanationOpen)}
            className="btn btn-sm btn-outline w-full"
          >
            <Shield size={16} />
            {explanationOpen ? 'Hide' : 'What are Shield Tokens?'}
          </button>

          {explanationOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 p-3 bg-base-300 rounded-lg text-sm space-y-2"
            >
              <div>
                <h4 className="font-bold mb-1 flex items-center gap-1">
                  <Shield size={14} className="text-purple-500" />
                  What are Shield Tokens?
                </h4>
                <p className="text-xs opacity-90">
                  Shield tokens protect your game streak when you're not selected to play.
                  When you use a shield, your streak is "frozen" at its current value, so missing
                  a game won't reset it to zero.
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-1">How to Earn Them</h4>
                <p className="text-xs opacity-90">
                  Earn 1 shield token for every 10 games you play. You can hold a maximum of 4 tokens at once.
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-1">How to Use Them</h4>
                <p className="text-xs opacity-90 mb-2">
                  You must choose to EITHER <strong>register for the game</strong> (👍 emoji) OR <strong>use a shield token</strong> (🛡️ emoji).
                  You cannot do both.
                </p>
                <p className="text-xs opacity-90">
                  To use a shield, respond to the WhatsApp game announcement with a 🛡️ emoji, or activate it
                  from the game page before registration closes. Your shield will automatically protect
                  your streak when the game completes.
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-1">Important Notes</h4>
                <ul className="text-xs opacity-90 list-disc list-inside space-y-1">
                  <li>You must decide: register for the game OR use a shield - not both</li>
                  <li>Once registration closes, all actions are final - no changes allowed</li>
                  <li>If you forget to react/register/use shield before registration closes, you cannot add it after</li>
                  <li>You can cancel your shield only before registration closes</li>
                  <li>Shields only work when you're <strong>not selected</strong> to play</li>
                  <li>You can only use 1 shield per game</li>
                  <li>Frozen streaks preserve your XP bonus (10% per streak level)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-1">💡 Strategy Tip</h4>
                <p className="text-xs opacity-90">
                  If you're away for <strong>multiple weeks</strong> but don't have enough shields to cover all weeks,
                  consider <strong>not</strong> using any. For example, if you have a 2-week holiday but only 1 shield,
                  using it on week 1 would protect your streak temporarily, but it would break on week 2 anyway.
                  Save your shields for when you can maintain attendance afterward, or save up enough shields to cover
                  your entire absence (e.g., 2 shields for a 2-week holiday).
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
