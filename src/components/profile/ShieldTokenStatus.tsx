import { useState } from 'react';
import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

interface ShieldTokenStatusProps {
  tokensAvailable: number;
  gamesTowardNextToken: number;
  gamesUntilNextToken: number;
  shieldActive: boolean;
  protectedStreakValue?: number | null;  // Original streak value when shield was activated
  currentStreak?: number;                // Current natural streak (for decay display)
  isLoading?: boolean;
  playerName?: string;
  /** @deprecated Use protectedStreakValue instead */
  frozenStreakValue?: number | null;
}

// Component to display shield token status with progress tracker and explanation
export default function ShieldTokenStatus({
  tokensAvailable,
  gamesTowardNextToken,
  gamesUntilNextToken,
  shieldActive,
  protectedStreakValue,
  currentStreak = 0,
  isLoading = false,
  playerName,
  frozenStreakValue,  // Legacy prop
}: ShieldTokenStatusProps) {
  const [explanationOpen, setExplanationOpen] = useState(false);

  // Use protectedStreakValue, fall back to legacy frozenStreakValue
  const protectedValue = protectedStreakValue ?? frozenStreakValue ?? null;

  // Calculate gradual decay values
  const decayingProtectedBonus = shieldActive && protectedValue != null
    ? Math.max(0, protectedValue - currentStreak)
    : null;
  const effectiveStreak = shieldActive && protectedValue != null
    ? Math.max(currentStreak, protectedValue - currentStreak)
    : currentStreak;
  const convergencePoint = shieldActive && protectedValue != null
    ? Math.ceil(protectedValue / 2)
    : null;

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

        {/* Active Shield Indicator with Gradual Decay Info */}
        {shieldActive && protectedValue != null && (
          <div className="space-y-2">
            <Tooltip content={`Shield protecting ${protectedValue} game streak with gradual decay`}>
              <div className="badge badge-success gap-2 w-full justify-center py-3">
                <Shield size={14} />
                <span className="font-medium">
                  SHIELD ACTIVE - Protected: {protectedValue} games
                </span>
              </div>
            </Tooltip>

            {/* Gradual Decay Progress */}
            <div className="bg-base-300 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-75">Natural Streak:</span>
                <span className="font-medium">{currentStreak} games</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-75">Protected Bonus:</span>
                <span className="font-medium text-purple-400">+{decayingProtectedBonus}0%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-75">Effective Bonus:</span>
                <span className="font-bold text-success">+{effectiveStreak}0%</span>
              </div>
              {convergencePoint != null && currentStreak < convergencePoint && (
                <div className="text-xs opacity-75 text-center mt-2">
                  {convergencePoint - currentStreak} more {convergencePoint - currentStreak === 1 ? 'game' : 'games'} until shield is removed
                </div>
              )}
            </div>
          </div>
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
                  Shield tokens protect your game streak when you need to miss a game due to <strong>planned absences</strong> (holidays, work, travel).
                  When you use a shield, your streak bonus is <strong>gradually protected</strong> &mdash;
                  it decays as you rebuild, meeting your natural streak in the middle.
                </p>
              </div>

              <div className="alert alert-warning py-2">
                <div>
                  <p className="text-xs font-semibold flex items-center gap-1">
                    <span>🩹</span> Got injured during WNF?
                  </p>
                  <p className="text-xs">
                    Use the <strong>Injury Token</strong> instead! It's free and designed for injuries during games.
                    Check your profile for the Injury Reserve section.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-1">How Gradual Decay Works</h4>
                <p className="text-xs opacity-90 mb-2">
                  Instead of losing your streak entirely, the protected bonus decreases by 1 for each game
                  you play, while your natural streak increases. They converge at the halfway point.
                </p>
                <div className="bg-base-200 p-2 rounded text-xs font-mono">
                  <p className="opacity-75 mb-1">Example: 10-game streak protected</p>
                  <p>Game 1: Natural 1, Protected 9 → +90%</p>
                  <p>Game 3: Natural 3, Protected 7 → +70%</p>
                  <p>Game 5: Natural 5, Protected 5 → +50% (converged!)</p>
                  <p>Game 6: Natural 6 → +60% (continues normally)</p>
                </div>
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
                  from the game page before registration closes.
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-1">Important Notes</h4>
                <ul className="text-xs opacity-90 list-disc list-inside space-y-1">
                  <li>You must decide: register for the game OR use a shield - not both</li>
                  <li>Once registration closes, all actions are final</li>
                  <li>You can cancel your shield only before registration closes</li>
                  <li>You can only use 1 shield per game</li>
                  <li>Missing a game during protection (without another shield) resets everything to 0</li>
                  <li>Shield protection is automatically removed once your streaks converge</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-1">💡 Strategy Tip</h4>
                <p className="text-xs opacity-90">
                  For <strong>multi-week absences</strong>, you need a shield for each week you'll miss.
                  Decay only starts when you return and play. For example, with a 10-game streak and
                  2 shields for a 2-week holiday: your streak stays at 10 for both weeks, then
                  decays when you return (needing 5 games to fully recover).
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
