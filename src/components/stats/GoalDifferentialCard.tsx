import { DollarSign, Target, MinusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

/**
 * Interface for the props of the GoalDifferentialCard component
 */
interface GoalDifferentialCardProps {
  goalDifferentials: Array<{
    id: string;
    friendlyName: string;
    caps: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifferential: number;
  }>;
}

/**
 * Component that displays goal differential statistics in a card
 * Shows a table with players' goals for, goals against, and goal differential
 * Includes gold, silver, and bronze medals for top performers
 * Card matches the size of other award cards
 */
export const GoalDifferentialCard = ({ goalDifferentials }: GoalDifferentialCardProps) => {
  // Return early if there's no data
  if (!goalDifferentials || goalDifferentials.length === 0) {
    return null;
  }

  // Get top 3 goal differentials for medal assignment
  const topThreeIds = goalDifferentials
    .slice(0, 3)
    .map(player => player.id);

  // Create medal emojis for the top three players
  const getMedal = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="card bg-base-100 shadow-xl overflow-hidden"
    >
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Goal Differentials
          </h2>
          <div className="flex gap-2">
            <Tooltip content="Goals scored by your team across all your games">
              <div className="badge badge-success flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Team GF
              </div>
            </Tooltip>
            <Tooltip content="Goals conceded by your team across all your games">
              <div className="badge badge-error flex items-center gap-1">
                <MinusCircle className="w-3 h-3" /> Team GA
              </div>
            </Tooltip>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Player</th>
                <th className="text-right">
                  <Tooltip content="Number of games played">
                    <span>Caps</span>
                  </Tooltip>
                </th>
                <th className="text-right text-success">
                  <Tooltip content="Total goals scored by your team across all your games">
                    <span>Team GF</span>
                  </Tooltip>
                </th>
                <th className="text-right text-error">
                  <Tooltip content="Total goals conceded by your team across all your games">
                    <span>Team GA</span>
                  </Tooltip>
                </th>
                <th className="text-right">
                  <Tooltip content="Goals For minus Goals Against">
                    <span>+/-</span>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {goalDifferentials.map((player, index) => (
                <tr key={player.id}>
                  <td className="text-center">
                    {topThreeIds.includes(player.id) ? (
                      <span>{getMedal(topThreeIds.indexOf(player.id))}</span>
                    ) : (
                      index + 1
                    )}
                  </td>
                  <td>{player.friendlyName}</td>
                  <td className="text-right">{player.caps}</td>
                  <td className="text-right text-success">{player.goalsFor}</td>
                  <td className="text-right text-error">{player.goalsAgainst}</td>
                  <td className={`text-right font-bold ${player.goalDifferential > 0 ? 'text-success' : player.goalDifferential < 0 ? 'text-error' : ''}`}>
                    {player.goalDifferential > 0 ? `+${player.goalDifferential}` : player.goalDifferential}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="text-xs mt-4 opacity-70">
          <p>Note: Only includes games with known scores. Goals are team totals, not individual player goals.</p>
        </div>
      </div>
    </motion.div>
  );
};
