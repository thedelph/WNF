// TeamDistributionBar component

/**
 * TeamDistributionBar - Visual representation of blue vs. orange team percentages
 * 
 * @param bluePercentage - Percentage of games played on blue team
 * @param orangePercentage - Percentage of games played on orange team
 */
export const TeamDistributionBar = ({ 
  bluePercentage, 
  orangePercentage,
  mobile = false
}: { 
  bluePercentage: number, 
  orangePercentage: number,
  mobile?: boolean
}) => {
  // Mobile view with smaller bar height and more compact design
  if (mobile) {
    return (
      <div className="flex flex-col w-full gap-1">
        <div className="flex justify-between text-xs">
          <span className="text-blue-600 font-semibold">{bluePercentage.toFixed(1)}%</span>
          <span className="text-orange-500 font-semibold">{orangePercentage.toFixed(1)}%</span>
        </div>
        <div className="h-3 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600 flex">
          <div 
            className="bg-blue-500 h-full transition-all duration-300 ease-in-out" 
            style={{ width: `${bluePercentage}%` }}
            title={`Blue: ${bluePercentage.toFixed(1)}%`}
          />
          <div 
            className="bg-orange-500 h-full transition-all duration-300 ease-in-out" 
            style={{ width: `${orangePercentage}%` }}
            title={`Orange: ${orangePercentage.toFixed(1)}%`}
          />
        </div>
      </div>
    );
  }
  
  // Desktop view (original)
  return (
    <div className="flex flex-col w-full gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-blue-600 font-semibold">{bluePercentage.toFixed(1)}%</span>
        <span className="text-orange-500 font-semibold">{orangePercentage.toFixed(1)}%</span>
      </div>
      <div className="h-4 w-full rounded-full overflow-hidden border border-gray-300 dark:border-gray-600 flex">
        <div 
          className="bg-blue-500 h-full transition-all duration-300 ease-in-out" 
          style={{ width: `${bluePercentage}%` }}
          title={`Blue: ${bluePercentage.toFixed(1)}%`}
        />
        <div 
          className="bg-orange-500 h-full transition-all duration-300 ease-in-out" 
          style={{ width: `${orangePercentage}%` }}
          title={`Orange: ${orangePercentage.toFixed(1)}%`}
        />
      </div>
    </div>
  );
};

export default TeamDistributionBar;
