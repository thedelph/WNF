// GameResultsBar.tsx

/**
 * GameResultsBar - Visual representation of game results (wins, losses, draws)
 * 
 * This component displays a bar chart visualization of a player's game results.
 * It uses color coding to indicate different results:
 * - Green for wins
 * - Red for losses
 * - Purple for draws
 * - Grey for unknown
 * 
 * @param wins - Number of games won
 * @param losses - Number of games lost
 * @param draws - Number of games drawn
 * @param total - Total number of games played (caps)
 */
export const GameResultsBar = ({ 
  wins, 
  losses,
  draws,
  total
}: { 
  wins: number, 
  losses: number,
  draws: number,
  total: number
}) => {
  // Calculate total known results
  const knownResults = wins + losses + draws;
  
  // Calculate unknown games (if any)
  const unknown = total - knownResults;
  
  // If no games played, show empty bar
  if (total === 0) {
    return (
      <div className="flex flex-col w-full gap-1">
        <div className="flex justify-between text-xs">
          <span className="font-semibold">0 caps</span>
          <span className="text-gray-500 font-semibold">No games played</span>
        </div>
        <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 bg-gray-200"></div>
      </div>
    );
  }
  
  // Calculate percentages for the bar segments
  const winPercentage = (wins / total) * 100;
  const lossPercentage = (losses / total) * 100;
  const drawPercentage = (draws / total) * 100;
  const unknownPercentage = (unknown / total) * 100;
  
  return (
    <div className="flex flex-col w-full gap-1">
      {/* Top row: total caps and W/L/D */}
      <div className="flex justify-between text-xs">
        <span className="font-semibold">{total} caps</span>
        <div>
          <span className="text-green-600 font-semibold">W: {wins}</span>
          <span className="mx-1">/</span>
          <span className="text-red-600 font-semibold">L: {losses}</span>
          <span className="mx-1">/</span>
          <span className="text-purple-600 font-semibold">D: {draws}</span>
          {unknown > 0 && (
            <>
              <span className="mx-1">/</span>
              <span className="text-gray-600 font-semibold">?: {unknown}</span>
            </>
          )}
        </div>
      </div>
      
      {/* The bar itself */}
      <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 flex">
        {/* Wins segment */}
        {wins > 0 && (
          <div 
            className="bg-green-500 h-full transition-all duration-300 ease-in-out" 
            style={{ width: `${winPercentage}%` }}
            title={`${wins} wins (${winPercentage.toFixed(1)}%)`}
          />
        )}
        
        {/* Losses segment */}
        {losses > 0 && (
          <div 
            className="bg-red-500 h-full transition-all duration-300 ease-in-out" 
            style={{ width: `${lossPercentage}%` }}
            title={`${losses} losses (${lossPercentage.toFixed(1)}%)`}
          />
        )}
        
        {/* Draws segment */}
        {draws > 0 && (
          <div 
            className="bg-purple-500 h-full transition-all duration-300 ease-in-out" 
            style={{ width: `${drawPercentage}%` }}
            title={`${draws} draws (${drawPercentage.toFixed(1)}%)`}
          />
        )}
        
        {/* Unknown segment */}
        {unknown > 0 && (
          <div 
            className="bg-gray-400 h-full transition-all duration-300 ease-in-out" 
            style={{ width: `${unknownPercentage}%` }}
            title={`${unknown} unknown results (${unknownPercentage.toFixed(1)}%)`}
          />
        )}
      </div>
    </div>
  );
};

export default GameResultsBar;
