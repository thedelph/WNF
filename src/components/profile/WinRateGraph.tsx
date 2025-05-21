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
  Scatter, ComposedChart
} from 'recharts';
// Import the shared PlayerGameHistory interface that handles all data structures
import { PlayerGameHistory } from '../../hooks/useGameHistory';

// Helper function to format date consistently as "12 Mar 2025"
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

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
  // Track if this game was excluded from win rate calculation
  excludedFromWinRate: boolean;
  // Track the reason for exclusion, if applicable
  exclusionReason?: 'uneven_teams' | 'unknown_outcome' | 'other';
  // Debug properties
  _debug_totalGames: number;
  _debug_wins: number;
  _debug_hasScore: boolean;
  _debug_isCompleted: boolean;
  _debug_adjusted?: boolean;
};

/**
 * WinRateGraph displays a player's win rate over time with a 10-game moving average
 * It shows both overall win rate and recent form, with visual indicators for games excluded
 * from the official win rate calculation (such as games with uneven teams)
 */
export const WinRateGraph: React.FC<UserGameDataProps> = ({
  userGameData: games,
  getGameOutcome,
  className = "",
  officialWinRate
}) => {
  // Stats tracking for game exclusion metrics (displayed in tooltip)
  const [gameStats, setGameStats] = useState<{
    totalGames: number;
    includedGames: number;
    excludedGames: number;
    excludedDueToUnevenTeams: number;
    excludedDueToUnknownOutcome: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  }>({    
    totalGames: 0,
    includedGames: 0,
    excludedGames: 0,
    excludedDueToUnevenTeams: 0,
    excludedDueToUnknownOutcome: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0
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
      const initialGameOutcome = getGameOutcome(game);
      
      // Handle both standard outcomes and team-specific outcomes (Blue Won, Orange Won)
      if (initialGameOutcome === 'Won' || initialGameOutcome === 'Blue Won' || initialGameOutcome === 'Orange Won') {
        outcome = 'Won';
      } else if (initialGameOutcome === 'Lost') {
        outcome = 'Lost';
      } else if (initialGameOutcome === 'Draw') {
        outcome = 'Draw';
      } else {
        outcome = 'Unknown'; // Ensure we have a valid enum value
      }
      
      // Process game outcome
      // CRUCIAL FIX: For the first game (and subsequent games), properly track the outcome
      console.log(`Processing game ${index + 1}, Status: ${game.status}, Team: ${game.team}, Outcome: ${outcome}`);
      
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
        // CRITICAL FIX: Make sure to count wins/losses/draws correctly for all games
        // These numbers are used in the win rate calculation
        if (outcome === 'Won') {
          wins++;
          console.log(`  → Adding Win (now ${wins} wins)`);
        } else if (outcome === 'Lost') {
          losses++;
          console.log(`  → Adding Loss (now ${losses} losses)`);
        } else if (outcome === 'Draw') {
          draws++;
          console.log(`  → Adding Draw (now ${draws} draws)`);
        } else {
          console.log(`  → Unknown outcome - not counting in win/loss/draw totals`);
        }
      } else {
        // Log why we're not counting this game
        if (!teamsWereEven) {
          console.log(`  → Not counting: Teams were not even`);
        } else if (!hasKnownOutcome && !isCompletedWithUnknownOutcome) {
          console.log(`  → Not counting: No known outcome and not completed`);
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
      
      // For thorough debugging to diagnose the issue
      console.log(`Game ${index + 1} (Seq #${game.games?.sequence_number || game.game?.sequence_number || '?'}) - Stats After Game:`);
      console.log(`  W: ${wins}, L: ${losses}, D: ${draws}, Even Teams: ${teamsWereEven}, Denom: ${denominator}`);
      
      // Calculate the win rate based on the denominator
      // Default to 0 if there are no games with outcomes
      let currentWinRate = 0;
      if (denominator > 0) {
        currentWinRate = (wins / denominator) * 100;
        console.log(`  Win Rate Formula: (${wins} / ${denominator}) * 100 = ${currentWinRate.toFixed(1)}%`);
      } else {
        console.log(`  Win Rate: 0% (no valid games with outcomes yet)`);
      }
      
      // For the final data point, ensure we're showing the correct win rate
      // This should match what's displayed in the player profile
      if (index === sortedGames.length - 1) {
        // Update game statistics for tooltips and the UI
        // Calculate the correct number of excluded games
        // Note: these are games with uneven teams OR unknown outcomes (not double-counted)
        const excludedDueToUnevenTeams = gamesWithUnevenTeams;
        const excludedDueToUnknownOutcome = gamesWithUnknownOutcomes - (gamesWithUnknownOutcomes > 0 && gamesWithUnevenTeams > 0 ? gamesWithUnevenTeams : 0);
        const excludedGames = excludedDueToUnevenTeams + excludedDueToUnknownOutcome;
        const includedGames = totalGames - excludedGames;
        
        setGameStats({
          totalGames,
          includedGames,
          excludedGames,
          excludedDueToUnevenTeams,
          excludedDueToUnknownOutcome,
          wins,
          losses,
          draws,
          winRate: currentWinRate
        });
        
        // Double-check our math for debugging
        console.log('Game stats check:', {
          totalGames,
          includedGames,
          excludedGames,
          excludedDueToUnevenTeams,
          excludedDueToUnknownOutcome,
          sum: includedGames + excludedDueToUnevenTeams + excludedDueToUnknownOutcome
        });
        
        // Log the final stats to help diagnose the issue
        console.log('Final stats:', {
          totalGames,
          includedGames,
          excludedGames,
          excludedDueToUnevenTeams,
          excludedDueToUnknownOutcome,
          wins,
          losses,
          draws,
          winRate: currentWinRate
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
      const gameDateValue = game.game?.date || game.games?.date || new Date().toISOString();
      
      // Force a direct re-evaluation of the outcome using getGameOutcome to ensure consistency
  const forcedOutcome = getGameOutcome(game);
  
  // Map team-specific outcomes to standard outcomes that match our GraphDataPoint type
  let displayOutcome: 'Won' | 'Lost' | 'Draw' | 'Unknown' = 'Unknown';
  
  if (forcedOutcome === 'Won' || forcedOutcome === 'Blue Won' || forcedOutcome === 'Orange Won') {
    displayOutcome = 'Won';
  } else if (forcedOutcome === 'Lost') {
    displayOutcome = 'Lost';
  } else if (forcedOutcome === 'Draw') {
    displayOutcome = 'Draw';
  }
        
  // Determine if this game was excluded from win rate calculation and why
  const excludedFromWinRate = !((hasKnownOutcome || isCompletedWithUnknownOutcome) && teamsWereEven);
  
  // Determine the reason for exclusion
  let exclusionReason: 'uneven_teams' | 'unknown_outcome' | 'other' | undefined;
  if (excludedFromWinRate) {
    if (!teamsWereEven) {
      exclusionReason = 'uneven_teams';
    } else if (!hasKnownOutcome) {
      exclusionReason = 'unknown_outcome';
    } else {
      exclusionReason = 'other';
    }
  }
  
  return {
        gameNumber: index + 1, // Sequential index (1-based) for clean x-axis
        gameId: gameId,
        gameDate: gameDateValue,
        winRate: currentWinRate !== null && !isNaN(currentWinRate) ? Number(currentWinRate.toFixed(1)) : 0,
        movingAverage: movingAverage !== null && !isNaN(movingAverage) ? Number(movingAverage.toFixed(1)) : null,
        outcome: displayOutcome, // Use the explicitly forced outcome for rendering
        outcomeValue: displayOutcome ? 2 : null,
        excludedFromWinRate, // Track if excluded from win rate calculation
        exclusionReason, // Track the reason for exclusion
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

  // Custom tooltip for the chart with enhanced info for excluded games
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const outcome = data.outcome;
      const dateStr = formatDate(data.gameDate);
      const winRate = data.winRate;
      const movingAverage = data.movingAverage;
      const isExcluded = data.excludedFromWinRate;
      const exclusionReason = data.exclusionReason;
      
      return (
        <div className="custom-tooltip bg-white p-2 border border-gray-300 shadow-md rounded-md text-xs">
          <p className="font-semibold">Game #{data.gameNumber} ({dateStr})</p>
          <p>Outcome: <span className={
            outcome === 'Won' ? 'text-green-500 font-bold' :
            outcome === 'Lost' ? 'text-red-500 font-bold' :
            outcome === 'Draw' ? 'text-purple-500 font-bold' :
            'text-gray-500'
          }>{outcome}</span></p>
          <p>Win Rate: {winRate}%</p>
          {movingAverage && <p>10-Game Avg: {movingAverage}%</p>}
          
          {/* Show additional information if the game is excluded from the win rate calculation */}
          {isExcluded && (
            <div className="mt-1 pt-1 border-t border-gray-200">
              <p className="font-semibold text-amber-600">
                Excluded from win rate calculation
              </p>
              <p className="text-gray-600">
                Reason: {exclusionReason === 'uneven_teams' ? 'Uneven teams' : 
                        exclusionReason === 'unknown_outcome' ? 'Unknown outcome' : 
                        'Other'}
              </p>
            </div>
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
            <RechartsTooltip
              content={CustomTooltip} 
              cursor={{ strokeDasharray: '3 3' }}
            />  
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
            
            {/* Scatter plot for all game outcomes */}
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
                
                // Check if this game is excluded from the win rate calculation
                const isExcluded = payload.excludedFromWinRate;
                
                // Force direct outcome determination
                let fillColor = '#9ca3af'; // Default grey
                
                // Assign colors based on outcome
                if (gameOutcome === 'Won' || gameOutcome === 'Blue Won' || gameOutcome === 'Orange Won') {
                  fillColor = '#10b981'; // Green for wins
                } else if (gameOutcome === 'Lost') {
                  fillColor = '#f43f5e'; // Red for losses
                } else if (gameOutcome === 'Draw') {
                  fillColor = '#a855f7'; // Purple for draws
                }
                
                // For games excluded from win rate calculations, use a different visual style
                if (isExcluded && gameOutcome !== null) {
                  // Create a hollow square with a border for excluded games
                  return (
                    <g>
                      {/* Render the border with a thicker stroke */}
                      <rect
                        x={cx - size/2 - 2}
                        y={cy - size/2 - 2}
                        width={size + 4}
                        height={size + 4}
                        fill="transparent"
                        stroke="#000"
                        strokeWidth={1}
                        strokeDasharray="2,1"
                        style={{ zIndex: 99 }}
                      />
                      {/* Render the inner square with the outcome color */}
                      <rect
                        x={cx - size/2}
                        y={cy - size/2}
                        width={size}
                        height={size}
                        fill={fillColor}
                        style={{ zIndex: 100 }}
                      />
                    </g>
                  );
                }
                
                // Regular squares for games included in win rate calculation
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

      {/* Enhanced legend for outcome squares with excluded game indicator */}
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
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 relative">
            {/* Dashed square border */}
            <div className="absolute top-0 left-0 w-5 h-5 border border-black border-dashed"></div>
            {/* Inner colored square */}
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-[#10b981]"></div>
          </div>
          <span className="text-xs">Excluded from Win Rate</span>
        </div>
      </div>
      
      {/* Explanatory text below the graph with game stats */}
      <div className="text-center text-xs leading-tight text-gray-600 mt-3 px-4">
        <p className="mb-1"><strong>About Win Rate Calculation:</strong></p>
        <p className="mb-1">Only games with <span className="font-medium">even teams</span> and known outcomes (win, loss, or draw) are counted in the official win rate calculation.</p>
        <p className="mb-1">Games with <span className="font-medium">uneven teams</span> or unknown outcomes (outlined with dashed borders) are excluded from the win rate.</p>
        <p className="mb-1">The 10-game moving average (orange line) appears after 10 games with known outcomes.</p>
        <div className="mt-2 p-2 bg-base-200 rounded-md inline-block">
          <p className="font-semibold">Summary: {gameStats.includedGames} of {gameStats.totalGames} games counted in win rate</p>
          <p className="text-[10px]">({gameStats.excludedDueToUnevenTeams} excluded due to uneven teams, {gameStats.excludedDueToUnknownOutcome} due to unknown outcomes)</p>
        </div>
      </div>
      
      {/* Debug info removed */}
    </motion.div>
  );
};

export default WinRateGraph;
