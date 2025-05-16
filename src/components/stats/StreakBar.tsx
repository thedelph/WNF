// StreakBar.tsx

/**
 * StreakBar - Visual representation of current and maximum streaks
 * 
 * This component displays a bar visualization of a player's current streak relative to their maximum streak.
 * It uses a primary bar to represent the maximum streak length with a marker showing the current streak position.
 * 
 * @param currentStreak - The player's current streak
 * @param maxStreak - The player's maximum/longest streak
 * @param label - Label indicating the type of streak ("Win" or "Unbeaten")
 * @param tableMax - The maximum streak value across all players in the table (for relative scaling)
 */
export const StreakBar = ({ 
  currentStreak, 
  maxStreak,
  label = "Win",
  tableMax = 0
}: { 
  currentStreak: number, 
  maxStreak: number,
  label?: string,
  tableMax?: number
}) => {
  // If max streak is 0, show empty bar
  if (maxStreak === 0) {
    return (
      <div className="flex flex-col w-full gap-1">
        <div className="flex justify-between text-xs">
          <span className="font-semibold">{label} Streak</span>
          <span className="text-gray-500 font-semibold">No streak data</span>
        </div>
        <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 bg-gray-200"></div>
      </div>
    );
  }
  
  // Use the maximum value between tableMax and maxStreak for scaling
  // This ensures that if tableMax is not provided, we still get a valid scale
  const actualMax = Math.max(tableMax || 0, maxStreak);
  
  // Calculate width percentage of max streak relative to the highest in the table
  const maxStreakPercentage = (maxStreak / actualMax) * 100;
  
  // Calculate the relative position of current streak within max streak
  // This positions the marker on the bar
  const currentPositionPercentage = currentStreak > 0 
    ? Math.min((currentStreak / maxStreak) * maxStreakPercentage, maxStreakPercentage) 
    : 0;
  
  // Determine colors based on streak type
  // Use purple for win streaks and amber/gold for unbeaten streaks
  const barColor = label.toLowerCase().includes('win') ? 'bg-purple-500' : 'bg-amber-500';
  const markerColor = label.toLowerCase().includes('win') ? 'bg-purple-700' : 'bg-amber-700';
  
  // Add a subtle glow effect to the marker to make it more noticeable
  const markerGlow = label.toLowerCase().includes('win') ? 'shadow-purple-500/50' : 'shadow-amber-500/50';
  
  return (
    <div className="flex flex-col w-full gap-1">
      {/* Top row: streak info */}
      <div className="flex justify-between text-xs">
        <span className="font-semibold">
          {currentStreak === maxStreak && currentStreak > 0 && (
            <span className="text-xs px-2 py-0.5 bg-accent text-accent-content rounded-md font-bold animate-pulse">PB!</span>
          )}
        </span>
        <div>
          <span className="font-semibold">Current: {currentStreak}</span>
          <span className="mx-1">/</span>
          <span className="font-semibold">Max: {maxStreak}</span>
        </div>
      </div>
      
      {/* The bar itself */}
      <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 bg-gray-200 relative">
        {/* Max streak segment */}
        <div 
          className={`${barColor} h-full transition-all duration-300 ease-in-out`} 
          style={{ width: `${maxStreakPercentage}%` }}
          title={`Max ${label} Streak: ${maxStreak}`}
        />
        
        {/* Current streak marker */}
        {currentStreak > 0 && (
          <div 
            className={`absolute top-0 h-full ${currentStreak === maxStreak ? 'w-3' : 'w-2'} ${markerColor} border-white border-l border-r shadow-md ${markerGlow} ${currentStreak === maxStreak ? 'animate-pulse' : ''}`}
            style={{ 
              left: `calc(${currentPositionPercentage}% - ${currentStreak === maxStreak ? 1.5 : 1}px)`,
              display: currentStreak > 0 ? 'block' : 'none',
              zIndex: 10 // Ensure marker is above the bar
            }}
            title={currentStreak === maxStreak ? 
              `Personal Best! Current ${label} Streak: ${currentStreak}` : 
              `Current ${label} Streak: ${currentStreak}`
            }
          />
        )}
      </div>
      
      {/* Visual legend */}
      <div className="flex items-center gap-3 text-xs mt-1">
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded-sm ${barColor}`}></div>
          <span>Max Streak</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-3 ${markerColor} border-white border-l border-r shadow-sm ${markerGlow}`}></div>
          <span>Current</span>
        </div>
      </div>
    </div>
  );
};

export default StreakBar;
