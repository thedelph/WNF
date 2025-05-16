// GoalsDistributionBar.tsx

/**
 * GoalsDistributionBar - Visual representation of goals for and against
 * 
 * This component displays a bar chart visualization of a player's goals data.
 * It can show different visualizations based on the mode:
 * - 'for-against': Shows goals for vs goals against side by side
 * - 'differential': Shows a single bar representing goal differential (can be positive or negative)
 * 
 * @param goalsFor - Number of goals scored
 * @param goalsAgainst - Number of goals conceded
 * @param goalDifferential - Difference between goals for and against
 * @param mode - Display mode ('for-against' or 'differential')
 * @param maxValue - Optional maximum value for scaling (if not provided, max of goalsFor+goalsAgainst is used)
 */
export const GoalsDistributionBar = ({ 
  goalsFor, 
  goalsAgainst,
  goalDifferential,
  mode = 'for-against',
  maxValue
}: { 
  goalsFor: number, 
  goalsAgainst: number,
  goalDifferential: number,
  mode?: 'for-against' | 'differential',
  maxValue?: number
}) => {
  // For differential mode
  if (mode === 'differential') {
    // Calculate percentage based on maxValue or use a default scaling
    const maxDiff = maxValue || Math.max(Math.abs(goalDifferential) * 2, 10);
    
    // Calculate the width and direction based on differential
    const isPositive = goalDifferential >= 0;
    const percentWidth = Math.min(Math.abs(goalDifferential) / maxDiff * 100, 50); // Limit to 50% in either direction
    
    return (
      <div className="flex flex-col w-full gap-1">
        <div className="text-center text-xs font-semibold">
          <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
            {goalDifferential > 0 ? '+' : ''}{goalDifferential}
          </span>
        </div>
        <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 bg-gray-200 relative">
          {/* Middle divider line */}
          <div className="absolute h-full w-[1px] bg-gray-400 left-1/2 transform -translate-x-1/2 z-10" />
          
          {/* The bar itself */}
          {isPositive ? (
            <div 
              className="bg-green-500 h-full absolute transition-all duration-300 ease-in-out left-1/2"
              style={{ width: `${percentWidth}%` }}
            />
          ) : (
            <div 
              className="bg-red-500 h-full absolute transition-all duration-300 ease-in-out right-1/2"
              style={{ width: `${percentWidth}%` }}
            />
          )}
        </div>
      </div>
    );
  }
  
  // For for-against mode (default)
  // Calculate total goals to determine percentages
  const totalGoals = goalsFor + goalsAgainst;
  
  // If no goals, show empty bar
  if (totalGoals === 0) {
    return (
      <div className="flex flex-col w-full gap-1">
        <div className="flex justify-between text-xs">
          <span className="text-green-600 font-semibold">0</span>
          <span className="text-red-600 font-semibold">0</span>
        </div>
        <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 bg-gray-200"></div>
      </div>
    );
  }
  
  // Calculate percentages
  const forPercentage = (goalsFor / totalGoals) * 100;
  const againstPercentage = (goalsAgainst / totalGoals) * 100;
  
  return (
    <div className="flex flex-col w-full gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-green-600 font-semibold">{goalsFor}</span>
        <span className="text-red-600 font-semibold">{goalsAgainst}</span>
      </div>
      <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 flex">
        <div 
          className="bg-green-500 h-full transition-all duration-300 ease-in-out" 
          style={{ width: `${forPercentage}%` }}
        />
        <div 
          className="bg-red-500 h-full transition-all duration-300 ease-in-out" 
          style={{ width: `${againstPercentage}%` }}
        />
      </div>
    </div>
  );
};

export default GoalsDistributionBar;
