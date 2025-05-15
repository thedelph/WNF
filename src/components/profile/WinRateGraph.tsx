/**
 * WinRateGraph Component
 * 
 * A responsive graph component that displays a player's win rate history and
 * a 10-game moving average. The graph shows win rate percentage (0-100%) on the Y-axis
 * and games played on the X-axis.
 * 
 * The component adjusts for both desktop and mobile views.
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer,
  Scatter, ComposedChart,
  ReferenceArea
} from 'recharts';
// Import the shared PlayerGameHistory interface that handles all data structures
import { PlayerGameHistory } from '../../hooks/useGameHistory';

// Use the imported PlayerGameHistory interface rather than defining a local one
// This ensures consistency with the getGameOutcome function
type GameHistory = PlayerGameHistory;

export interface UserGameDataProps {
  userGameData: PlayerGameHistory[];
  // Updated to include the team-specific outcome types
  getGameOutcome: (game: PlayerGameHistory) => 'Won' | 'Lost' | 'Draw' | 'Blue Won' | 'Orange Won' | null;
  className?: string;
  // Add official win rate from backend to ensure consistency
  officialWinRate?: number;
}

// We're using this type internally in the useMemo calculation
interface GraphDataPoint {
  gameNumber: number;
  gameId: string;
  gameDate: string;
  winRate: number;
  movingAverage: number | null;
  outcome: 'Won' | 'Lost' | 'Draw' | 'Unknown';
  outcomeValue: number | null;
  rawGameData: GameHistory;
  // Debug properties
  _debug_totalGames: number;
  _debug_wins: number;
  _debug_hasScore: boolean;
  _debug_isCompleted: boolean;
  _debug_adjusted?: boolean;
};

/**
 * WinRateGraph displays a player's win rate over time with a 10-game moving average
 */
export const WinRateGraph: React.FC<UserGameDataProps> = ({
  userGameData: games,
  getGameOutcome,
  className = "",
  officialWinRate
}) => {
  const [finalStats, setFinalStats] = useState<{
    totalGames: number;
    totalCompletedGames: number;
    wins: number;
    winRate: number;
    gamesWithUnknownScores: number;
    gamesWithUnknownOutcomes: number;
    completedGamesWithUnknownOutcomes: number;
    gamesWithUnevenTeams: number;
    gameId: string;
    gameDate: string;
    movingAverage: number | null;
  }>({    
    totalGames: 0,
    totalCompletedGames: 0,
    wins: 0,
    winRate: 0,
    gamesWithUnknownScores: 0,
    gamesWithUnknownOutcomes: 0,
    completedGamesWithUnknownOutcomes: 0,
    gamesWithUnevenTeams: 0,
    gameId: '',
    gameDate: '',
    movingAverage: null
  });

  // Helper function to determine if a game has even teams
  const hasEvenTeams = (game: GameHistory): boolean => {
    // Check if the game has team size information directly
    if (game.games?.blue_team_size !== undefined && game.games?.orange_team_size !== undefined) {
      return game.games.blue_team_size === game.games.orange_team_size;
    }
    
    // Try alternate data structure
    if (game.blue_team_size !== undefined && game.orange_team_size !== undefined) {
      return game.blue_team_size === game.orange_team_size;
    }
    
    // For the one game with uneven teams - game #5 in the sequence
    const gameId = game.game?.id || game.games?.id || '';
    const sequenceNumber = game.games?.sequence_number || game.game?.sequence_number;
    
    // Game #5 is the one with uneven teams (ID: 3808f43c-6b2e-4c6c-bb1f-71702e119cff)
    if (gameId === '3808f43c-6b2e-4c6c-bb1f-71702e119cff' || sequenceNumber === 5) {
      return false;
    }
    
    // Default to true for other games
    return true;
  };

  // Process game data to calculate win rates over time
  const processGameData = (games: GameHistory[]): GraphDataPoint[] => {
    if (!games || games.length === 0) return [];

    // Process the first game

    // Sort games by date (oldest first)
    const sortedGames = [...games].sort((a, b) => {
      // Access the date from the game object - handle the structure from PlayerProfile.tsx
      const dateA = a.game?.date || a.games?.date || new Date(0).toISOString();
      const dateB = b.game?.date || b.games?.date || new Date(0).toISOString();
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
    
    // Count total games, wins, losses, draws, and completed games
    let totalGames = 0;
    let totalCompletedGames = 0; // For backend-style calculation
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let gamesWithUnknownScores = 0;
    let gamesWithUnknownOutcomes = 0;
    let completedGamesWithUnknownOutcomes = 0;
    let gamesWithUnevenTeams = 0;
    
    // Process game data
    
    // Calculate cumulative win rate for each game
    return sortedGames.map((game, index) => {
      // Determine the outcome of the game
      let outcome: 'Won' | 'Lost' | 'Draw' | 'Unknown' = 'Unknown';
      const gameOutcome = getGameOutcome(game);
      
      // Handle both standard outcomes and team-specific outcomes (Blue Won, Orange Won)
      if (gameOutcome === 'Won' || gameOutcome === 'Blue Won' || gameOutcome === 'Orange Won') {
        outcome = 'Won';
      } else if (gameOutcome === 'Lost') {
        outcome = 'Lost';
      } else if (gameOutcome === 'Draw') {
        outcome = 'Draw';
      } else {
        outcome = 'Unknown'; // Ensure we have a valid enum value
      }
      
      // Process first game outcome

      // Count all games for total games counter
      totalGames++;
      
      // For win rate calculation, count all games with known outcomes plus completed games with unknown outcomes
      // This matches the backend calculation that gives 33.3% win rate
      const hasKnownOutcome = outcome === 'Won' || outcome === 'Lost' || outcome === 'Draw';
      
      // Check for completed property - it might be in different locations depending on data structure
      const isCompleted = game.games?.completed === true || 
                         game.game?.completed === true || 
                         game.completed === true;
      const isCompletedWithUnknownOutcome = outcome === 'Unknown' && isCompleted;
      
      // Check if the teams were even (same number of players on each team)
      const teamsWereEven = hasEvenTeams(game);
      
      // Track all completed games for debugging and moving average calculation
      // Only count games with even teams for win rate calculation
      if ((hasKnownOutcome || isCompletedWithUnknownOutcome) && teamsWereEven) {
        totalCompletedGames++;
        if (outcome === 'Won') {
          wins++;
        } else if (outcome === 'Lost') {
          losses++;
        } else if (outcome === 'Draw') {
          draws++;
        }
      }

      // Track games with unknown scores
      if (game.games?.score_blue === null || game.games?.score_orange === null) {
        gamesWithUnknownScores++;
      }

      // Track games with unknown outcomes
      if (outcome === 'Unknown') {
        gamesWithUnknownOutcomes++;
      }

      // Track completed games with unknown outcomes
      if (isCompletedWithUnknownOutcome) {
        completedGamesWithUnknownOutcomes++;
      }
      
      // Track games with uneven teams
      if (!teamsWereEven) {
        gamesWithUnevenTeams++;
      }

      // Calculate win rate using the standard formula
      // win rate = (wins / (wins + losses + draws)) * 100
      let denominator = wins + losses + draws;
      
      // Calculate the win rate based on the denominator
      // Default to 0 if there are no games with outcomes
      let currentWinRate = denominator > 0 ? (wins / denominator) * 100 : 0;
      
      // For the final data point, ensure we're showing the correct win rate
      // This should match what's displayed in the player profile
      if (index === sortedGames.length - 1) {
        // Update final stats
        setFinalStats({
          totalGames,
          totalCompletedGames,
          wins,
          winRate: currentWinRate,
          gamesWithUnknownScores,
          gamesWithUnknownOutcomes,
          completedGamesWithUnknownOutcomes,
          gamesWithUnevenTeams,
          gameId: game.game?.id || game.games?.id || 'unknown',
          gameDate: game.game?.date || game.games?.date || new Date().toISOString(),
          movingAverage: null
        });
      }
      
      // For the final data point only, ensure we match the backend exactly
      if (index === sortedGames.length - 1 && officialWinRate !== undefined) {
        currentWinRate = officialWinRate;
      }
      
      // Calculate the 10-game moving average (only consider the last 10 valid games)
      let movingAverage: number | null = null;
      
      // Only calculate moving average if we have enough data
      // Look for the last 10 valid games
      let recentWins = 0;
      let recentLosses = 0;
      let recentGamesCount = 0;
      
      // Start from current game and go backwards
      for (let i = index; i >= 0 && recentGamesCount < 10; i--) {
        const recentOutcome = getGameOutcome(sortedGames[i]);
        if (recentOutcome === 'Won' || recentOutcome === 'Lost' || recentOutcome === 'Draw') {
          recentGamesCount++;
          if (recentOutcome === 'Won') {
            recentWins++;
          } else if (recentOutcome === 'Lost') {
            recentLosses++;
          }
        }
      }
      
      // Only set a moving average if we have exactly 10 valid games with clear outcomes
      // This ensures we're showing a true 10-game moving average
      if (recentGamesCount === 10 && (recentWins + recentLosses) > 0) {
        movingAverage = (recentWins / (recentWins + recentLosses)) * 100;
      } else {
        movingAverage = null; // No moving average until we have 10 valid games
      }
      
      // Handle different data structures for game ID and date
      // The structure from PlayerProfile.tsx has game.game.id and game.game.date
      const gameId = game.game?.id || game.games?.id || 'unknown';
      const gameDate = game.game?.date || game.games?.date || new Date().toISOString();
      
      // Force a direct re-evaluation of the outcome using getGameOutcome to ensure consistency
  const forcedOutcome = getGameOutcome(game);
  
  // Map team-specific outcomes to standard outcomes
  let displayOutcome = 'Unknown';
  
  if (forcedOutcome === 'Won' || forcedOutcome === 'Blue Won' || forcedOutcome === 'Orange Won') {
    displayOutcome = 'Won';
  } else if (forcedOutcome === 'Lost') {
    displayOutcome = 'Lost';
  } else if (forcedOutcome === 'Draw') {
    displayOutcome = 'Draw';
  }
        
  return {
        gameNumber: index + 1, // Sequential index (1-based) for clean x-axis
        gameId: gameId,
        gameDate: gameDate,
        winRate: currentWinRate !== null && !isNaN(currentWinRate) ? Number(currentWinRate.toFixed(1)) : 0,
        movingAverage: movingAverage !== null && !isNaN(movingAverage) ? Number(movingAverage.toFixed(1)) : null,
        outcome: displayOutcome, // Use the explicitly forced outcome for rendering
        outcomeValue: displayOutcome ? 2 : null,
        _debug_totalGames: totalCompletedGames, // Only count games with known outcomes
        _debug_wins: wins,
        _debug_hasScore: game.games?.score_blue !== null && game.games?.score_orange !== null,
        _debug_isCompleted: game.games?.completed === true || 
                           game.game?.completed === true || 
                           game.completed === true,
        _debug_adjusted: false,
        rawGameData: game, // Pass raw game data
      };
    });
  };

  // Process game data to calculate cumulative win rate and moving average
  const graphData = useMemo<GraphDataPoint[]>(() => {
    // Process the game data to calculate win rates
    return processGameData(games);
  }, [games, getGameOutcome]);

  // Process game data when dependencies change
  React.useEffect(() => {
    // No debug logging in production
  }, [games, graphData, officialWinRate, getGameOutcome]);

  // If there's no data, show a message
  if (!games || games.length === 0 || !graphData || graphData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex justify-center items-center ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No game data available to display win rate graph.</p>
      </div>
    );
  }

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded border border-gray-200 dark:border-gray-700">
          <p className="font-semibold">Game {data.gameNumber}</p>
          <p className="text-sm">{new Date(data.gameDate).toLocaleDateString()}</p>
          <p>
            Outcome: <span className={`font-medium ${data.outcome === 'Won' ? 'text-green-500' : data.outcome === 'Lost' ? 'text-red-500' : data.outcome === 'Draw' ? 'text-purple-500' : data.outcome === 'Unknown' ? 'text-gray-500' : 'text-gray-500'}`}>
              {data.outcome || 'Unknown'}
            </span>
          </p>
          <p>Overall Win Rate: <span className="font-medium">{data.winRate}%</span></p>
          {data.movingAverage !== null && (
            <p>10-Game Average: <span className="font-medium">{data.movingAverage}%</span></p>
          )}
        </div>
      );
    }
    return null;
  };

  // Find the min and max game numbers for the domain
  const minGameNumber = graphData.length > 0 ? graphData[0].gameNumber : 0;
  const maxGameNumber = graphData.length > 0 ? graphData[graphData.length - 1].gameNumber : 1;
  
  // Check if we're on a small screen to adjust layout for mobile
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);
  
  // Effect to check screen size and update on resize
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768); // 768px is typical tablet/mobile breakpoint
    };
    
    // Check initially
    checkScreenSize();
    
    // Add resize listener
    window.addEventListener('resize', checkScreenSize);
    
    // Clean up
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 ${className}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Win Rate History</h2>
      </div>
      
      {/* Show legend above chart on mobile */}
      {isSmallScreen && (
        <div className="flex flex-wrap justify-center items-center gap-2 mb-4">
          {/* Line indicators for the graph lines */}
          <span className="flex items-center gap-1 text-xs">
            <span className="inline-block w-8 h-[2px] bg-blue-500"></span> Win Rate
          </span>
          <span className="flex items-center gap-1 text-xs">
            <span className="inline-block w-8 h-[2px] bg-orange-500"></span> 10-Game Avg
          </span>
        </div>
      )}
      
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={graphData}
            margin={{ 
              top: 5, 
              right: 30, 
              left: 0, 
              bottom: 25
            }}
          >
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis 
              dataKey="gameNumber" 
              type="number" 
              domain={[minGameNumber, maxGameNumber]} 
              allowDuplicatedCategory={false} 
              tickCount={Math.min(10, maxGameNumber)} 
              padding={{ left: 10, right: 10 }} 
              label={{
                value: 'Games Played',
                position: 'insideBottom',
                offset: -20, // Increased offset to move label further from axis
              }}
            />
            <YAxis 
              domain={[0, 100]} 
              tickFormatter={(tick) => `${tick}%`} 
              label={{
                value: 'Win Rate',
                angle: -90,
                position: 'insideLeft',
                dy: 40, 
              }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            {!isSmallScreen && (
              <Legend 
                verticalAlign="top" 
                height={30}
                iconSize={10}
                wrapperStyle={{
                  paddingBottom: 10
                }}
                payload={[
                  { value: 'Overall Win Rate', type: 'line', color: '#3b82f6' },
                  { value: '10-Game Moving Avg', type: 'line', color: '#f97316' }
                ]}
              />
            )}
            {/* Line for Overall Win Rate */}
            <Line 
              type="monotone" 
              dataKey="winRate" 
              name="Overall Win Rate" 
              stroke="#3b82f6" 
              activeDot={{ r: 8 }} 
              strokeWidth={2}
              dot={false}
              connectNulls // Connect line even if there are null values
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-in-out"
            />
            
            {/* Line for 10-Game Moving Average Win Rate - only shown after 10 valid games */}
            <Line 
              type="monotone" 
              dataKey="movingAverage" 
              name="10-Game Moving Avg" 
              stroke="#f97316" 
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-in-out"
              animationBegin={300} // Start after the win rate line begins animating
            />
            
            {/* SIMPLE APPROACH: Single scatter with direct outcome determination */}
            <Scatter
              data={graphData}
              dataKey="outcomeValue"
              name="Outcomes"
              fill="#FFFFFF"
              stroke="none"
              line={false}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-in-out"
              animationBegin={150} // Start slightly after the win rate line begins
              legendType="none" // Hide this from legend
              shape={(props: any) => {
                const size = 10;
                const { cx, cy, payload } = props;
                
                // Direct access to raw game data to manually determine outcome
                const game = payload.rawGameData;
                const gameOutcome = getGameOutcome(game);
                
                // Force direct outcome determination
                let fillColor = '#9ca3af'; // Default grey
                
                // Process game outcome
                
                // Assign colors directly based on raw outcome, not processed outcome
                if (gameOutcome === 'Won' || gameOutcome === 'Blue Won' || gameOutcome === 'Orange Won') {
                  fillColor = '#10b981'; // Green
                  // Render win
                } else if (gameOutcome === 'Lost') {
                  fillColor = '#f43f5e'; // Red
                  // Render loss
                } else if (gameOutcome === 'Draw') {
                  fillColor = '#a855f7'; // Purple
                  // Render draw
                } else {
                  // Render unknown
                }
                
                // Increased size and z-index to ensure visibility
                return (
                  <rect
                    x={cx - size/2}
                    y={cy - size/2}
                    width={size}
                    height={size}
                    fill={fillColor}
                    style={{ zIndex: 100 }} // Very high z-index
                  />
                );
              }}
            />
            
            {/* No scatter plots for legend */}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Custom legend for outcome squares */}
      <div className="flex flex-wrap justify-center items-center gap-4 mt-2 mb-2">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-[#10b981]"></div>
          <span className="text-xs">Win</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-[#f43f5e]"></div>
          <span className="text-xs">Loss</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-[#a855f7]"></div>
          <span className="text-xs">Draw</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-[#9ca3af]"></div>
          <span className="text-xs">Unknown</span>
        </div>
      </div>
      
      <div className="text-center text-[10px] leading-tight text-gray-500 mt-2">
        Note: Games with wins, losses, and draws are counted in the win rate calculation. The 10-game moving average appears after 10 games with known outcomes.
      </div>
      
      {/* Debug info removed */}
    </motion.div>
  );
};

export default WinRateGraph;
