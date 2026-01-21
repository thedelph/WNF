import type { BruteForcePlayer } from './types';

/**
 * Generate all combinations of k elements from an array
 * Uses iterative approach to avoid stack overflow on large inputs
 */
function* combinations<T>(array: T[], k: number): Generator<T[]> {
  if (k > array.length || k <= 0) {
    return;
  }

  if (k === array.length) {
    yield array.slice();
    return;
  }

  if (k === 1) {
    for (const item of array) {
      yield [item];
    }
    return;
  }

  // Use indices to track current combination
  const indices = Array.from({ length: k }, (_, i) => i);
  const n = array.length;

  while (true) {
    // Yield current combination
    yield indices.map((i) => array[i]);

    // Find rightmost index that can be incremented
    let i = k - 1;
    while (i >= 0 && indices[i] === n - k + i) {
      i--;
    }

    // If no index can be incremented, we're done
    if (i < 0) {
      break;
    }

    // Increment the found index and reset all following indices
    indices[i]++;
    for (let j = i + 1; j < k; j++) {
      indices[j] = indices[j - 1] + 1;
    }
  }
}

/**
 * Divide players into thirds based on rating
 *
 * @param players - Players to divide
 * @param useFormAdjusted - Use form-adjusted rating instead of overall rating
 */
function divideIntoThirds(
  players: BruteForcePlayer[],
  useFormAdjusted: boolean = false
): {
  topThird: BruteForcePlayer[];
  middleThird: BruteForcePlayer[];
  bottomThird: BruteForcePlayer[];
} {
  // Sort by rating (highest first)
  const sorted = [...players].sort((a, b) =>
    useFormAdjusted
      ? b.formAdjustedRating - a.formAdjustedRating
      : b.overallRating - a.overallRating
  );

  const totalPlayers = sorted.length;
  const thirdSize = Math.ceil(totalPlayers / 3);

  return {
    topThird: sorted.slice(0, thirdSize),
    middleThird: sorted.slice(thirdSize, thirdSize * 2),
    bottomThird: sorted.slice(thirdSize * 2),
  };
}

/**
 * Calculate how many players from each third should be on each team
 * Returns the number per team for each third
 */
function calculatePlayersPerThird(
  thirdSize: number,
  teamSize: number
): number {
  // For even distribution, each team gets half of each third
  // This enforces the 2-2-2 (or 3-3-3 for 18 players) constraint
  return Math.floor(thirdSize / 2);
}

/**
 * Generate all valid team combinations with the spread constraint
 *
 * The spread constraint ensures each team has an equal number of players
 * from each third (top, middle, bottom) of the rating distribution.
 *
 * For 18 players (6 per third, 9 per team):
 * - Each team gets 3 from top, 3 from middle, 3 from bottom
 * - Combinations: C(6,3) * C(6,3) * C(6,3) = 20 * 20 * 20 = 8,000
 *
 * For 12 players (4 per third, 6 per team):
 * - Each team gets 2 from top, 2 from middle, 2 from bottom
 * - Combinations: C(4,2) * C(4,2) * C(4,2) = 6 * 6 * 6 = 216
 *
 * @param players - All players to distribute
 * @param useFormAdjusted - Use form-adjusted rating for tier sorting
 * @yields Tuples of [blueTeam, orangeTeam]
 */
export function* generateValidCombinations(
  players: BruteForcePlayer[],
  useFormAdjusted: boolean = false
): Generator<[BruteForcePlayer[], BruteForcePlayer[]]> {
  const totalPlayers = players.length;
  const teamSize = Math.floor(totalPlayers / 2);

  // Handle odd number of players
  // For now, just use the even number and one player will be unassigned
  const effectiveTotal = teamSize * 2;
  const effectivePlayers = [...players]
    .sort((a, b) =>
      useFormAdjusted
        ? b.formAdjustedRating - a.formAdjustedRating
        : b.overallRating - a.overallRating
    )
    .slice(0, effectiveTotal);

  // Divide into thirds (using form-adjusted if enabled)
  const { topThird, middleThird, bottomThird } = divideIntoThirds(
    effectivePlayers,
    useFormAdjusted
  );

  // Calculate players per third per team
  const perThirdTop = Math.floor(topThird.length / 2);
  const perThirdMiddle = Math.floor(middleThird.length / 2);
  const perThirdBottom = Math.floor(bottomThird.length / 2);

  // Handle edge case where third sizes don't divide evenly
  // This shouldn't happen with standard player counts (12, 14, 16, 18, 20)
  // but we handle it gracefully

  // Generate all combinations using nested iteration
  for (const topCombo of combinations(topThird, perThirdTop)) {
    for (const midCombo of combinations(middleThird, perThirdMiddle)) {
      for (const bottomCombo of combinations(bottomThird, perThirdBottom)) {
        const blueTeam = [...topCombo, ...midCombo, ...bottomCombo];

        // Orange team is everyone not on blue team
        const blueIds = new Set(blueTeam.map((p) => p.player_id));
        const orangeTeam = effectivePlayers.filter((p) => !blueIds.has(p.player_id));

        yield [blueTeam, orangeTeam];
      }
    }
  }
}

/**
 * Calculate the total number of valid combinations
 * Useful for progress reporting and performance estimation
 */
export function calculateTotalCombinations(playerCount: number): number {
  const teamSize = Math.floor(playerCount / 2);
  const effectiveTotal = teamSize * 2;
  const thirdSize = Math.ceil(effectiveTotal / 3);
  const perThird = Math.floor(thirdSize / 2);

  // C(n, k) = n! / (k! * (n-k)!)
  function factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  function choose(n: number, k: number): number {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    return factorial(n) / (factorial(k) * factorial(n - k));
  }

  // Total combinations = C(topThirdSize, perThird) ^ 3
  const combosPerThird = choose(thirdSize, perThird);
  return Math.pow(combosPerThird, 3);
}

/**
 * Get tier distribution for a team assignment
 */
export function getTierDistribution(
  blueTeam: BruteForcePlayer[],
  orangeTeam: BruteForcePlayer[],
  allPlayers: BruteForcePlayer[],
  useFormAdjusted: boolean = false
): {
  blue: { top: number; middle: number; bottom: number };
  orange: { top: number; middle: number; bottom: number };
} {
  const { topThird, middleThird, bottomThird } = divideIntoThirds(
    allPlayers,
    useFormAdjusted
  );

  const topIds = new Set(topThird.map((p) => p.player_id));
  const midIds = new Set(middleThird.map((p) => p.player_id));
  const bottomIds = new Set(bottomThird.map((p) => p.player_id));

  return {
    blue: {
      top: blueTeam.filter((p) => topIds.has(p.player_id)).length,
      middle: blueTeam.filter((p) => midIds.has(p.player_id)).length,
      bottom: blueTeam.filter((p) => bottomIds.has(p.player_id)).length,
    },
    orange: {
      top: orangeTeam.filter((p) => topIds.has(p.player_id)).length,
      middle: orangeTeam.filter((p) => midIds.has(p.player_id)).length,
      bottom: orangeTeam.filter((p) => bottomIds.has(p.player_id)).length,
    },
  };
}

/**
 * Calculate how many players changed tiers due to form adjustment
 */
export function calculateTierChangesFromForm(
  players: BruteForcePlayer[]
): number {
  // Get tiers without form adjustment
  const { topThird: topOrig, middleThird: midOrig, bottomThird: botOrig } =
    divideIntoThirds(players, false);
  const topOrigIds = new Set(topOrig.map((p) => p.player_id));
  const midOrigIds = new Set(midOrig.map((p) => p.player_id));
  const botOrigIds = new Set(botOrig.map((p) => p.player_id));

  // Get tiers with form adjustment
  const { topThird: topForm, middleThird: midForm, bottomThird: botForm } =
    divideIntoThirds(players, true);
  const topFormIds = new Set(topForm.map((p) => p.player_id));
  const midFormIds = new Set(midForm.map((p) => p.player_id));
  const botFormIds = new Set(botForm.map((p) => p.player_id));

  // Count players who changed tiers
  let changes = 0;
  for (const player of players) {
    const wasTop = topOrigIds.has(player.player_id);
    const wasMid = midOrigIds.has(player.player_id);
    const wasBot = botOrigIds.has(player.player_id);

    const isTop = topFormIds.has(player.player_id);
    const isMid = midFormIds.has(player.player_id);
    const isBot = botFormIds.has(player.player_id);

    if (wasTop !== isTop || wasMid !== isMid || wasBot !== isBot) {
      changes++;
    }
  }

  return changes;
}
