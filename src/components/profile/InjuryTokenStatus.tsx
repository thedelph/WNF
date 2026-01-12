import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';
import { InjuryTokenStatusData } from '../../types/tokens';

interface InjuryTokenStatusProps {
  injuryStatus: InjuryTokenStatusData | null;
  isLoading?: boolean;
  playerName?: string;
}

// Helper to format date nicely
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Component to display injury token status with explanation
export default function InjuryTokenStatus({
  injuryStatus,
  isLoading = false,
  playerName,
}: InjuryTokenStatusProps) {
  const [explanationOpen, setExplanationOpen] = useState(false);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-amber-900/20 border border-amber-500/40 shadow-xl p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🩹</span>
          <h3 className="text-lg font-bold text-amber-400">Injury Reserve</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <span className="loading loading-spinner loading-md text-amber-400"></span>
        </div>
      </motion.div>
    );
  }

  // If no injury status or not active, show minimal state
  if (!injuryStatus || !injuryStatus.isActive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-200 shadow-xl p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl opacity-50">🩹</span>
          <h3 className="text-lg font-bold opacity-75">Injury Reserve</h3>
        </div>

        <div className="text-center py-4">
          <p className="text-sm opacity-75">
            {playerName ? `${playerName} is not currently on injury reserve.` : 'Not currently on injury reserve.'}
          </p>
        </div>

        {/* Expandable Explanation Section */}
        <div className="mt-2">
          <button
            onClick={() => setExplanationOpen(!explanationOpen)}
            className="btn btn-sm btn-outline w-full"
          >
            <span>🩹</span>
            {explanationOpen ? 'Hide' : 'What is Injury Reserve?'}
          </button>

          {explanationOpen && (
            <InjuryTokenExplanation />
          )}
        </div>
      </motion.div>
    );
  }

  // Active injury token state
  const {
    originalStreak,
    returnStreak,
    activatedAt,
    injuryGameDate,
    injuryGameNumber,
    daysOnReserve
  } = injuryStatus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-gradient-to-br from-amber-900/40 via-orange-900/40 to-amber-900/40 border-2 border-amber-400/60 shadow-xl shadow-amber-500/20 p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🩹</span>
        <h3 className="text-lg font-bold text-amber-400">Injury Reserve</h3>
      </div>

      <div className="flex flex-col gap-3">
        {/* Active Status Badge */}
        <Tooltip content={playerName ? `${playerName} is on injury reserve` : 'You are on injury reserve'}>
          <div className="badge badge-warning gap-2 w-full justify-center py-3">
            <span>🩹</span>
            <span className="font-medium">
              ON INJURY RESERVE
            </span>
          </div>
        </Tooltip>

        {/* Streak Information */}
        <div className="bg-base-300/50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="opacity-75">Original Streak:</span>
            <span className="font-medium text-amber-300">{originalStreak ?? 0} games</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="opacity-75">Return Streak:</span>
            <Tooltip content="Your streak will be set to this value when you return to play">
              <span className="font-bold text-warning">{returnStreak ?? 0} games</span>
            </Tooltip>
          </div>
          {originalStreak != null && returnStreak != null && (
            <div className="text-xs opacity-75 text-center mt-2 bg-base-200/50 p-2 rounded">
              Return at <span className="text-amber-400 font-medium">{returnStreak}</span> games
              (50% of original {originalStreak}-game streak)
            </div>
          )}
        </div>

        {/* Injury Details */}
        <div className="bg-base-300/50 rounded-lg p-3 space-y-2">
          {injuryGameNumber != null && (
            <div className="flex justify-between text-sm">
              <span className="opacity-75">Injury Game:</span>
              <span className="font-medium">Game #{injuryGameNumber}</span>
            </div>
          )}
          {injuryGameDate && (
            <div className="flex justify-between text-sm">
              <span className="opacity-75">Injury Date:</span>
              <span className="font-medium">{formatDate(injuryGameDate)}</span>
            </div>
          )}
          {activatedAt && (
            <div className="flex justify-between text-sm">
              <span className="opacity-75">Claimed:</span>
              <span className="font-medium">{formatDate(activatedAt)}</span>
            </div>
          )}
          {daysOnReserve != null && daysOnReserve > 0 && (
            <div className="flex justify-between text-sm">
              <span className="opacity-75">Days on Reserve:</span>
              <span className="font-medium">{daysOnReserve} {daysOnReserve === 1 ? 'day' : 'days'}</span>
            </div>
          )}
        </div>

        {/* Return Information */}
        <div className="alert alert-warning py-2 bg-amber-900/30 border-amber-500/30">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-amber-200">
              Ready to return?
            </p>
            <p className="text-xs opacity-90">
              Simply register for a game to come off injury reserve. Your streak will automatically be set to {returnStreak ?? 0} games.
            </p>
          </div>
        </div>

        {/* Expandable Explanation Section */}
        <div className="mt-2">
          <button
            onClick={() => setExplanationOpen(!explanationOpen)}
            className="btn btn-sm btn-outline btn-warning w-full"
          >
            <span>🩹</span>
            {explanationOpen ? 'Hide' : 'How does this work?'}
          </button>

          {explanationOpen && (
            <InjuryTokenExplanation />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Separate component for explanation to keep things clean
function InjuryTokenExplanation() {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-3 p-3 bg-base-300 rounded-lg text-sm space-y-2"
    >
      <div>
        <h4 className="font-bold mb-1 flex items-center gap-1">
          <span>🩹</span>
          What is Injury Reserve?
        </h4>
        <p className="text-xs opacity-90">
          Injury Reserve is a protection system for players who get injured <strong>during</strong> a WNF game.
          It preserves half of your game streak while you recover.
        </p>
      </div>

      <div>
        <h4 className="font-bold mb-1">How It Works</h4>
        <p className="text-xs opacity-90 mb-2">
          When you claim an injury token, your streak is recorded. When you return to play,
          your streak is set to <strong>50%</strong> of your original value (rounded up).
        </p>
        <div className="bg-base-200 p-2 rounded text-xs font-mono">
          <p className="opacity-75 mb-1">Example: 10-game streak</p>
          <p>• Get injured during game → claim injury token</p>
          <p>• Original streak preserved: 10 games</p>
          <p>• Return to play → streak set to 5 games</p>
          <p>• Continue building from there!</p>
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-1">Who Can Use It?</h4>
        <ul className="text-xs opacity-90 list-disc list-inside space-y-1">
          <li>Must have been <strong>selected</strong> for the game where injury occurred</li>
          <li>Injury must have happened <strong>during</strong> the WNF game</li>
          <li>Fair-use policy applies (admins can review claims)</li>
        </ul>
      </div>

      <div>
        <h4 className="font-bold mb-1">How to Return</h4>
        <p className="text-xs opacity-90">
          Simply register for a game when you're ready. Your injury reserve status will be automatically
          cleared and your streak will be set to the return value.
        </p>
      </div>

      <div>
        <h4 className="font-bold mb-1 flex items-center gap-1">
          <span className="text-purple-400">🛡️</span>
          vs Shield Token
        </h4>
        <div className="overflow-x-auto">
          <table className="table table-xs bg-base-200 rounded">
            <thead>
              <tr>
                <th></th>
                <th className="text-purple-400">Shield 🛡️</th>
                <th className="text-amber-400">Injury 🩹</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              <tr>
                <td>Use for</td>
                <td>Planned absences</td>
                <td>WNF injuries</td>
              </tr>
              <tr>
                <td>Return XP</td>
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
    </motion.div>
  );
}
