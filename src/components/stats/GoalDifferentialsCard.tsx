import { Target } from 'lucide-react';
import { motion } from 'framer-motion';

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
  // Get top 10 players only
  const displayPlayers = goalDifferentials.slice(0, 10);
  
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
        
        {/* Custom-built table with perfect alignment */}
        <div className="space-y-1 mb-4">
          {/* Fixed header row with column titles */}
          <div className="flex justify-between items-center text-xs opacity-80 pb-2 pr-1">
            <div className="flex-1">Player</div>
            <div className="grid grid-cols-4 gap-3 w-40">
              <div className="text-center">Caps</div>
              <div className="text-center">GF</div>
              <div className="text-center">GA</div>
              <div className="text-center">+/-</div>
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
              <div className="flex justify-between items-center">
                {/* Player name with medal */}
                <div className="flex items-center gap-2 min-w-0 flex-shrink flex-grow overflow-hidden max-w-[50%]">
                  {index < 3 ? (
                    <span className="w-5 h-5 flex-shrink-0">{medals[index]}</span>
                  ) : (
                    <span className="w-5 h-5 flex-shrink-0"></span>
                  )}
                  <span className="truncate block">{player.friendlyName}</span>
                </div>
                
                {/* Stats with perfect alignment - now with Caps column */}
                <div className="grid grid-cols-4 gap-3 w-40 text-right pr-1">
                  <div className="text-center text-white/90">{player.caps}</div>
                  <div className="text-success text-center">{player.goalsFor}</div>
                  <div className="text-error text-center">{player.goalsAgainst}</div>
                  <div className={`font-bold text-center ${player.goalDifferential > 0 ? 'text-success' : player.goalDifferential < 0 ? 'text-error' : ''}`}>
                    {player.goalDifferential > 0 ? `+${player.goalDifferential}` : player.goalDifferential}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <p className="text-sm opacity-80 mt-auto text-left">
          Team goals scored minus team goals conceded (only players with 10+ caps)
        </p>
      </div>
    </motion.div>
  );
};
