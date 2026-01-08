import { Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

// Custom card for goal differentials with perfect column alignment
interface GoalDiffCardProps {
  goalDifferentials: Array<{
    id: string;
    friendlyName: string;
    caps: number;       // Games played
    goalsFor: number;   // Team goals scored
    goalsAgainst: number; // Team goals conceded
    goalDifferential: number; // The difference (GF - GA)
  }>;
}

export const GoalDifferentialsCard = ({ goalDifferentials }: GoalDiffCardProps) => {
  // Sort by GF/GA ratio instead of goal differential
  const sortedPlayers = [...goalDifferentials].sort((a, b) => {
    // Handle cases where goalsAgainst is 0 (infinity ratio)
    if (a.goalsAgainst === 0 && b.goalsAgainst === 0) {
      // If both have 0 goals against, sort by goals for (higher is better)
      return b.goalsFor - a.goalsFor;
    } else if (a.goalsAgainst === 0) {
      // If only a has 0 goals against, it comes first
      return -1;
    } else if (b.goalsAgainst === 0) {
      // If only b has 0 goals against, it comes first
      return 1;
    }
    
    // Normal case: Sort by GF/GA ratio
    const aRatio = a.goalsFor / a.goalsAgainst;
    const bRatio = b.goalsFor / b.goalsAgainst;
    return bRatio - aRatio;
  });
  
  // Get top 10 players only
  const displayPlayers = sortedPlayers.slice(0, 10);
  
  // The medal emojis for top performers
  const medals = ['🥇', '🥈', '🥉'];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card bg-gradient-to-br from-indigo-300 via-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/50 animate-gradient-xy"
    >
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-title text-lg font-bold">Team Goal Differentials</h2>
          <div><Target className="w-6 h-6" /></div>
        </div>
        
        {/* Responsive mobile notice - Only visible on xs screens */}
        <div className="lg:hidden text-xs mb-2 text-white/80">
          <p className="text-center">👉 Swipe horizontally to view all stats 👈</p>
        </div>

        {/* Scrollable container for mobile */}
        <div className="overflow-x-auto pb-2 -mx-2 px-2">
          {/* Custom-built table with responsive design */}
          <div className="space-y-1 mb-4 min-w-[320px]">
            {/* Header row with column titles */}
            <div className="flex text-xs opacity-80 pb-2 pr-1">
              {/* Left side: Name column */}
              <div className="w-[40%] min-w-[120px]">Player</div>
              {/* Right side: Stats columns */}
              <div className="grid grid-cols-5 gap-1 xs:gap-2 flex-1">
                <div className="text-center">Caps</div>
                <div className="text-center">GF</div>
                <div className="text-center">GA</div>
                <div className="text-center">+/-</div>
                <div className="text-center relative">
                  <span>GF/GA</span>
                  <Tooltip content="Ratio of Goals For to Goals Against">
                    <span className="cursor-help text-info absolute -right-2 -top-1 text-xs">ⓘ</span>
                  </Tooltip>
                </div>
              </div>
            </div>
            
            {/* Player rows */}
            {displayPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center">
                  {/* Player name with medal - fixed width for consistent layout */}
                  <div className="flex items-center gap-1 xs:gap-2 w-[40%] min-w-[120px]">
                    {index < 3 ? (
                      <span className="w-5 h-5 flex-shrink-0">{medals[index]}</span>
                    ) : (
                      <span className="w-5 h-5 flex-shrink-0"></span>
                    )}
                    <span className="truncate block" title={player.friendlyName}>{player.friendlyName}</span>
                  </div>
                  
                  {/* Stats with responsive layout */}
                  <div className="grid grid-cols-5 gap-1 xs:gap-2 flex-1 text-right pr-1">
                    <div className="text-center text-white/90">{player.caps}</div>
                    <div className="text-success text-center">{player.goalsFor}</div>
                    <div className="text-error text-center">{player.goalsAgainst}</div>
                    <div className={`font-bold text-center ${player.goalDifferential > 0 ? 'text-success' : player.goalDifferential < 0 ? 'text-error' : ''}`}>
                      {player.goalDifferential > 0 ? `+${player.goalDifferential}` : player.goalDifferential}
                    </div>
                    <div className={`text-center font-semibold ${player.goalsAgainst === 0 ? 'text-warning' : (player.goalsFor / player.goalsAgainst) >= 1 ? 'text-success' : 'text-error'}`}>
                      {player.goalsAgainst === 0 
                        ? '∞' 
                        : (player.goalsFor / player.goalsAgainst).toFixed(1)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        <p className="text-sm opacity-80 mt-auto text-left">
          Players ranked by GF/GA ratio. GF/GA shows ratio of goals scored to conceded (only players with 10+ caps)
        </p>
      </div>
    </motion.div>
  );
};
