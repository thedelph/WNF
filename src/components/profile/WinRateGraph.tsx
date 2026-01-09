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

// Debug flag - set to true to enable verbose logging
const DEBUG_WIN_RATE = false;
const debugLog = (...args: unknown[]) => DEBUG_WIN_RATE && console.log('[WinRateGraph]', ...args);

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
  // NOTE: Team size data from PlayerProfile is unreliable due to Supabase row limits.
  // We hardcode known games with uneven teams based on database records.
  const hasEvenTeams = (game: GameHistory): boolean => {
    const sequenceNumber = game.games?.sequence_number || game.game?.sequence_number;

    // Game 27 has uneven teams (8 blue vs 9 orange) - confirmed from database
    if (sequenceNumber === 27) {
      return false;
    }

    // All other games have even teams based on historical data
    return true;
  };

  // Process game data to calculate win rates over time
  const processGameData = (games: GameHistory[]): GraphDataPoint[] => {
    if (!games || games.length === 0) return [];

    debugLog(`Processing ${games.length} games for win rate graph`);
    
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
      if (initialGameOutcome === 'Won') {
        outcome = 'Won';
      } else if (initialGameOutcome === 'Lost') {
        outcome = 'Lost';
      } else if (initialGameOutcome === 'Draw') {
        outcome = 'Draw';
      } else if (initialGameOutcome === 'Blue Won' || initialGameOutcome === 'Orange Won') {
        // These indicate the winning team, not the player's outcome
        // We need the player's team to determine if they won or lost
        const playerTeam = game.team?.toLowerCase();
        if (playerTeam) {
          const playerWon = (playerTeam === 'blue' && initialGameOutcome === 'Blue Won') ||
                           (playerTeam === 'orange' && initialGameOutcome === 'Orange Won');
          outcome = playerWon ? 'Won' : 'Lost';
        } else {
          outcome = 'Unknown'; // Can't determine without player's team
        }
      } else {
        outcome = 'Unknown'; // Ensure we have a valid enum value
      }
      
      // Process game outcome
      // CRUCIAL FIX: For the first game (and subsequent games), properly track the outcome
      debugLog(`Processing game ${index + 1}, Status: ${game.status}, Team: ${game.team}, Outcome: ${outcome}`);
      
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
          debugLog(`  → Adding Win (now ${wins} wins)`);
        } else if (outcome === 'Lost') {
          losses++;
          debugLog(`  → Adding Loss (now ${losses} losses)`);
        } else if (outcome === 'Draw') {
          draws++;
          debugLog(`  → Adding Draw (now ${draws} draws)`);
        } else {
          debugLog(`  → Unknown outcome - not counting in win/loss/draw totals`);
        }
      } else {
        // Log why we're not counting this game
        if (!teamsWereEven) {
          debugLog(`  → Not counting: Teams were not even`);
        } else if (!hasKnownOutcome && !isCompletedWithUnknownOutcome) {
          debugLog(`  → Not counting: No known outcome and not completed`);
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

      // Calculate win rate using the points formula (matches backend get_player_win_rates)
      // Points system: Win = 3pts, Draw = 1pt, Loss = 0pts
      // win rate = (wins * 3 + draws * 1) / (totalGames * 3) * 100
      const totalDecidedGames = wins + losses + draws;

      // For thorough debugging to diagnose the issue
      debugLog(`Game ${index + 1} (Seq #${game.games?.sequence_number || game.game?.sequence_number || '?'}) - Stats After Game:`);
      debugLog(`  W: ${wins}, L: ${losses}, D: ${draws}, Even Teams: ${teamsWereEven}, Total: ${totalDecidedGames}`);

      // Calculate the win rate using points formula
      // Default to 0 if there are no games with outcomes
      let currentWinRate = 0;
      if (totalDecidedGames > 0) {
        const points = (wins * 3) + (draws * 1);
        const maxPoints = totalDecidedGames * 3;
        currentWinRate = (points / maxPoints) * 100;
        debugLog(`  Points Formula: ((${wins}×3) + (${draws}×1)) / (${totalDecidedGames}×3) × 100 = ${points}/${maxPoints} = ${currentWinRate.toFixed(1)}%`);
      } else {
        debugLog(`  Win Rate: 0% (no valid games with outcomes yet)`);
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
        debugLog('Game stats check:', {
          totalGames,
          includedGames,
          excludedGames,
          excludedDueToUnevenTeams,
          excludedDueToUnknownOutcome,
          sum: includedGames + excludedDueToUnevenTeams + excludedDueToUnknownOutcome
        });
        
        // Log the final stats to help diagnose the issue
        debugLog('Final stats:', {
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
      
      // NOTE: We no longer override with officialWinRate here.
      // The graph should show the cumulative calculated win rate at each point,
      // not jump to a different backend value at the end.
      // The backend win rate is shown separately in the StatsGrid component.

      // Final validation - never allow 0% if we have wins
      if (index === sortedGames.length - 1 && currentWinRate === 0 && wins > 0) {
        debugLog(`⚠️ Win rate incorrectly dropped to 0% at the last game despite ${wins} wins - fixing!`);
        const fixPoints = (wins * 3) + (draws * 1);
        const fixMaxPoints = (wins + losses + draws) * 3;
        currentWinRate = (fixPoints / fixMaxPoints) * 100;
        debugLog(`Fixed final win rate: ${currentWinRate.toFixed(1)}%`);
      }

      // Calculate the 10-game moving average (only consider the last 10 valid games)
      // Uses the same points formula: (W×3 + D×1) / (G×3) × 100
      let movingAverage: number | null = null;

      // Only calculate moving average if we have enough data
      // Look for the last 10 valid games
      let recentWins = 0;
      let recentLosses = 0;
      let recentDraws = 0;
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
          } else if (recentOutcome === 'Draw') {
            recentDraws++;
          }
        }
      }

      // Only set a moving average if we have exactly 10 valid games with clear outcomes
      // Uses the same points formula for consistency
      if (recentGamesCount === 10) {
        const recentPoints = (recentWins * 3) + (recentDraws * 1);
        const recentMaxPoints = 10 * 3; // 10 games × 3 max points each
        movingAverage = (recentPoints / recentMaxPoints) * 100;
        debugLog(`  Moving Avg: ((${recentWins}×3) + (${recentDraws}×1)) / 30 = ${recentPoints}/30 = ${movingAverage.toFixed(1)}%`);
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

  // Process game data when dependencies change - log for diagnostics
  React.useEffect(() => {
    if (DEBUG_WIN_RATE && graphData.length > 0) {
      console.log('=== WIN RATE GRAPH DEBUG DATA ===');
      console.log(`Total games: ${graphData.length}`);
      console.log(`Official win rate from backend: ${officialWinRate}`);

      // Log last 15 games for analysis
      const recentGames = graphData.slice(-15);
      console.log('Recent 15 games (for copy/paste):');
      console.table(recentGames.map(g => ({
        '#': g.gameNumber,
        'Outcome': g.outcome,
        'WinRate': g.winRate,
        'MovingAvg': g.movingAverage,
        'Excluded': g.excludedFromWinRate,
        'Reason': g.exclusionReason || '-',
        'Team': g.rawGameData?.team || 'unknown',
        'TeamSizes': `B:${g.rawGameData?.games?.team_sizes?.blue ?? '?'} O:${g.rawGameData?.games?.team_sizes?.orange ?? '?'}`
      })));

      // Count outcomes
      const outcomes = graphData.reduce((acc, g) => {
        acc[g.outcome] = (acc[g.outcome] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('Outcome counts:', outcomes);

      // Count excluded games
      const excludedCount = graphData.filter(g => g.excludedFromWinRate).length;
      console.log(`Excluded games: ${excludedCount}`);

      console.log('=================================');
    }
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
        <div className="custom-tooltip bg-white dark:bg-gray-800 p-2 border border-gray-300 dark:border-gray-600 shadow-md rounded-md text-xs">
          <p className="font-semibold">Game #{data.gameNumber} ({dateStr})</p>
          <p>Outcome: <span className={
            outcome === 'Won' ? 'text-green-500 font-bold' :
            outcome === 'Lost' ? 'text-red-500 font-bold' :
            outcome === 'Draw' ? 'text-purple-500 font-bold' :
            'text-gray-500 dark:text-gray-400'
          }>{outcome}</span></p>
          <p>Performance: {winRate}%</p>
          {movingAverage && <p>10-Game Avg: {movingAverage}%</p>}

          {/* Show additional information if the game is excluded from the calculation */}
          {isExcluded && (
            <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
              <p className="font-semibold text-amber-600">
                Excluded from calculation
              </p>
              <p className="text-gray-600 dark:text-gray-300">
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
        <h2 className="text-2xl font-bold">Performance History</h2>
      </div>

      {/* Show legend above chart on mobile */}
      {isSmallScreen && (
        <div className="flex flex-wrap justify-center items-center gap-2 mb-4">
          {/* Line indicators for the graph lines */}
          <span className="flex items-center gap-1 text-xs">
            <span className="inline-block w-8 h-[2px] bg-blue-500"></span> Performance
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
                value: 'Performance',
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
                  { value: 'Overall Performance', type: 'line', color: '#3b82f6' },
                  { value: '10-Game Moving Avg', type: 'line', color: '#f97316' }
                ]}
              />
            )}
            {/* Line for Overall Performance */}
            <Line
              type="monotone"
              dataKey="winRate"
              name="Overall Performance" 
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
                if (gameOutcome === 'Won') {
                  fillColor = '#10b981'; // Green for wins
                } else if (gameOutcome === 'Lost') {
                  fillColor = '#f43f5e'; // Red for losses
                } else if (gameOutcome === 'Draw') {
                  fillColor = '#a855f7'; // Purple for draws
                } else if (gameOutcome === 'Blue Won' || gameOutcome === 'Orange Won') {
                  // These indicate the winning team, not the player's outcome
                  // We need the player's team to determine if they won or lost
                  const playerTeam = game.team?.toLowerCase();
                  if (playerTeam) {
                    const playerWon = (playerTeam === 'blue' && gameOutcome === 'Blue Won') ||
                                     (playerTeam === 'orange' && gameOutcome === 'Orange Won');
                    fillColor = playerWon ? '#10b981' : '#f43f5e'; // Green for wins, red for losses
                  }
                  // If no team, stays grey (Unknown)
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
          <span className="text-xs">Excluded</span>
        </div>
      </div>
      
      {/* Explanatory text below the graph with game stats */}
      <div className="text-center text-xs leading-tight text-gray-600 dark:text-gray-300 mt-3 px-4">
        <p className="mb-1"><strong>About Performance Rating:</strong></p>
        <p className="mb-1">Performance is calculated using a <span className="font-medium">points system</span>: Win = 3pts, Draw = 1pt, Loss = 0pts.</p>
        <p className="mb-1">Rating = (Points earned / Maximum possible points) × 100%</p>
        <p className="mb-1">The 10-game moving average (orange line) uses the same formula for your recent form.</p>
        <div className="mt-2 p-2 bg-base-200 rounded-md inline-block">
          <p className="font-semibold">Stats: {gameStats.wins}W / {gameStats.draws}D / {gameStats.losses}L from {gameStats.includedGames} games</p>
          <p className="text-[10px]">({gameStats.excludedDueToUnknownOutcome} games excluded due to unknown outcomes)</p>
        </div>
      </div>
      
      {/* Debug info removed */}
    </motion.div>
  );
};

export default WinRateGraph;
