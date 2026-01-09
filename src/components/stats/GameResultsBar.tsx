// GameResultsBar.tsx

/**
 * GameResultsBar - Visual representation of game results (wins, losses, draws)
 * 
 * This component displays a bar chart visualization of a player's game results.
 * It uses color coding to indicate different results:
 * - Green for wins
 * - Red for losses
 * - Purple for draws
 * 
 * @param wins - Number of games won
 * @param losses - Number of games lost
 * @param draws - Number of games drawn
 * @param total - (Optional) Total number of games played (caps)
 */
export const GameResultsBar = ({ 
  wins, 
  losses,
  draws,
  total,
  mobile = false
}: { 
  wins: number, 
  losses: number,
  draws: number,
  total?: number,
  mobile?: boolean
}) => {
  // Calculate total known results
  const knownResults = wins + losses + draws;
  
  // If no known results, show empty bar
  if (knownResults === 0) {
    return (
      <div className="flex flex-col w-full gap-1">
        <div className="flex justify-between text-xs">
          <span className="font-semibold">0 caps</span>
          <span className="text-gray-500 dark:text-gray-400 font-semibold">No games played</span>
        </div>
        <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700"></div>
      </div>
    );
  }
  
  // Calculate percentages for the bar segments based on known results only
  const winPercentage = (wins / knownResults) * 100;
  const lossPercentage = (losses / knownResults) * 100;
  const drawPercentage = (draws / knownResults) * 100;
  
  // Mobile-specific layout adjustments
  if (mobile) {
    return (
      <div className="flex flex-col w-full gap-1">
        {/* More compact mobile layout */}
        <div className="flex justify-between text-xs">
          <span className="text-green-600 font-semibold">{wins}</span>
          <span className="text-purple-600 font-semibold">{draws}</span>
          <span className="text-red-600 font-semibold">{losses}</span>
        </div>
        
        {/* Thinner bar for mobile */}
        <div className="h-3 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600 flex">
          {/* Wins segment */}
          {wins > 0 && (
            <div 
              className="bg-green-500 h-full transition-all duration-300 ease-in-out" 
              style={{ width: `${winPercentage}%` }}
              title={`${wins} wins (${winPercentage.toFixed(1)}%)`}
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
          
          {/* Losses segment */}
          {losses > 0 && (
            <div 
              className="bg-red-500 h-full transition-all duration-300 ease-in-out" 
              style={{ width: `${lossPercentage}%` }}
              title={`${losses} losses (${lossPercentage.toFixed(1)}%)`}
            />
          )}
        </div>
      </div>
    );
  }
  
  // Desktop layout (original)
  return (
    <div className="flex flex-col w-full gap-1">
      {/* Top row: caps info and W/L/D */}
      <div className="flex justify-between text-xs">
        <span className="font-semibold">
          {/* Show different text based on whether total is provided */}
          {total !== undefined ? `${knownResults} of ${total}` : `${knownResults} games`}
        </span>
        <div>
          <span className="text-green-600 font-semibold">W: {wins}</span>
          <span className="mx-1">/</span>
          <span className="text-purple-600 font-semibold">D: {draws}</span>
          <span className="mx-1">/</span>
          <span className="text-red-600 font-semibold">L: {losses}</span>
        </div>
      </div>
      
      {/* The bar itself */}
      <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600 flex">
        {/* Wins segment */}
        {wins > 0 && (
          <div 
            className="bg-green-500 h-full transition-all duration-300 ease-in-out" 
            style={{ width: `${winPercentage}%` }}
            title={`${wins} wins (${winPercentage.toFixed(1)}%)`}
          />
        )}
        
        {/* Draws segment - moved to the middle */}
        {draws > 0 && (
          <div 
            className="bg-purple-500 h-full transition-all duration-300 ease-in-out" 
            style={{ width: `${drawPercentage}%` }}
            title={`${draws} draws (${drawPercentage.toFixed(1)}%)`}
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
        
        {/* No Unknown segment - removed */}
      </div>
    </div>
  );
};

export default GameResultsBar;
