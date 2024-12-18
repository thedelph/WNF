import { ReservePlayer } from '../../types/playerSelection';

/**
 * Calculate how many players should receive offers based on time until game day
 * @param now Current date/time
 * @param gameDayStart Start of the game day
 * @param reservePlayers List of reserve players
 * @returns Number of players to receive offers
 */
export const calculateEligiblePlayers = (
  now: Date,
  gameDayStart: Date,
  reservePlayers: ReservePlayer[]
): number => {
  const hoursUntilGameDay = (gameDayStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // If it's game day or past game day, all players are eligible
  if (hoursUntilGameDay <= 0) {
    return reservePlayers.length;
  }

  // Calculate percentage of players based on time until game day
  // The closer to game day, the more players get offers
  const maxHours = 48; // Maximum hours before game day we start offering slots
  const percentageOfTime = Math.max(0, Math.min(1, 1 - (hoursUntilGameDay / maxHours)));
  const numPlayers = Math.max(1, Math.ceil(percentageOfTime * reservePlayers.length));
  
  console.log(
    `Hours until game day: ${hoursUntilGameDay}, ` +
    `Percentage of time elapsed: ${(percentageOfTime * 100).toFixed(1)}%, ` +
    `Players to notify: ${numPlayers}`
  );
  
  return numPlayers;
};
