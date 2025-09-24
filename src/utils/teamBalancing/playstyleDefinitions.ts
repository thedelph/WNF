/**
 * Complete playstyle definitions with attribute weights
 * Used for similarity-based playstyle detection
 */

export interface PlaystyleWeights {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface PlaystyleDefinition {
  id: string;
  name: string;
  category: 'attacking' | 'midfield' | 'defensive';
  weights: PlaystyleWeights;
}

// All 65 playstyle definitions from the database
export const PLAYSTYLE_DEFINITIONS: PlaystyleDefinition[] = [
  // Attacking styles (19)
  { id: '63d39f4f-fa86-45df-b460-1646ae883e6b', name: 'Ace', category: 'attacking',
    weights: { pace: 0, shooting: 1, passing: 1, dribbling: 1, defending: 0, physical: 1 }},
  { id: '6d76cd60-fed9-4acf-9955-9d3e5f291899', name: 'Attacker', category: 'attacking',
    weights: { pace: 1, shooting: 1, passing: 0, dribbling: 1, defending: 0, physical: 0 }},
  { id: '805eda95-b70f-45c6-98e8-6a6a0ee9a62b', name: 'Deadeye', category: 'attacking',
    weights: { pace: 0, shooting: 1, passing: 1, dribbling: 0, defending: 0, physical: 0 }},
  { id: 'eeae4c3e-d006-4d48-addc-df55b69a369d', name: 'Dribbler', category: 'attacking',
    weights: { pace: 0, shooting: 0, passing: 0, dribbling: 1, defending: 0, physical: 0 }},
  { id: 'b0f29c12-db18-4ae6-9d76-51f47240b3fe', name: 'Finisher', category: 'attacking',
    weights: { pace: 0, shooting: 1, passing: 0, dribbling: 0, defending: 0, physical: 1 }},
  { id: 'defb5e68-7dae-45a1-af76-9f25dc1f60e9', name: 'Forward', category: 'attacking',
    weights: { pace: 1, shooting: 1, passing: 0, dribbling: 1, defending: 1, physical: 0 }},
  { id: '14bed117-fe73-494d-b600-022d4a7b06de', name: 'Genius', category: 'attacking',
    weights: { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 0 }},
  { id: '0d6622ab-b07f-4b57-bf43-d41b37b2fc9f', name: 'Hawk', category: 'attacking',
    weights: { pace: 1, shooting: 1, passing: 0, dribbling: 0, defending: 0, physical: 1 }},
  { id: '3b6c8e35-aff2-4e0b-8f9d-70f2cd561c1b', name: 'Hunter', category: 'attacking',
    weights: { pace: 1, shooting: 1, passing: 0, dribbling: 0, defending: 0, physical: 0 }},
  { id: '8e89a996-1c15-4876-a4dc-deabfadc465e', name: 'Magician', category: 'attacking',
    weights: { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 0, physical: 0 }},
  { id: '625e3030-e57c-411f-bf58-6bc85486a5f2', name: 'Marksman', category: 'attacking',
    weights: { pace: 0, shooting: 1, passing: 0, dribbling: 1, defending: 0, physical: 1 }},
  { id: '26cc03a3-bde7-4e6d-b822-d8affbedc03d', name: 'Phenomenon', category: 'attacking',
    weights: { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 0, physical: 1 }},
  { id: '70a2c1a4-4d22-411c-86b9-2c13fc301251', name: 'Poacher', category: 'attacking',
    weights: { pace: 0, shooting: 1, passing: 0, dribbling: 0, defending: 0, physical: 0 }},
  { id: '88dde498-6f3d-4354-892a-422d7b9ec1e8', name: 'Predator', category: 'attacking',
    weights: { pace: 1, shooting: 1, passing: 0, dribbling: 0, defending: 0, physical: 1 }},
  { id: 'd8c868b9-04b5-43cc-b1ae-e740f783788f', name: 'Shooter', category: 'attacking',
    weights: { pace: 0, shooting: 1, passing: 0, dribbling: 0, defending: 0, physical: 0 }},
  { id: '95619cd5-caf6-401f-9aec-dc6f24f1767f', name: 'Sniper', category: 'attacking',
    weights: { pace: 0, shooting: 1, passing: 0, dribbling: 1, defending: 0, physical: 0 }},
  { id: 'd5c54379-4229-4305-9728-d84508c83073', name: 'Speedster', category: 'attacking',
    weights: { pace: 1, shooting: 0, passing: 0, dribbling: 1, defending: 0, physical: 0 }},
  { id: '8b72a3a3-0420-4a50-94f7-072b048fdd67', name: 'Striker', category: 'attacking',
    weights: { pace: 1, shooting: 1, passing: 0, dribbling: 1, defending: 0, physical: 1 }},
  { id: '1a01bec7-b944-4709-ac8e-b37a5ecc610d', name: 'Target Man', category: 'attacking',
    weights: { pace: 1, shooting: 1, passing: 0, dribbling: 1, defending: 0, physical: 1 }},

  // Midfield styles (24)
  { id: '4870d6fd-f6ee-4fab-8337-551eb0e97bc8', name: 'All-Rounder', category: 'midfield',
    weights: { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 1 }},
  { id: '29ab3d96-d6d9-40ea-8dac-0b34e0008aac', name: 'Architect', category: 'midfield',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 0, defending: 0, physical: 1 }},
  { id: 'a74e47ef-9663-4b8d-9483-22838d11207c', name: 'Artist', category: 'midfield',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 1, defending: 0, physical: 0 }},
  { id: 'fdd48802-dc17-4a1c-a0c7-44f123db5e1b', name: 'Box-to-Box', category: 'midfield',
    weights: { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 1 }},
  { id: '7f04ab71-4bee-4c6e-820e-b1aff2a7785e', name: 'Captain', category: 'midfield',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 0, defending: 1, physical: 1 }},
  { id: '8aa5db61-1b0f-4376-bad0-a7508e93b849', name: 'Catalyst', category: 'midfield',
    weights: { pace: 1, shooting: 0, passing: 1, dribbling: 0, defending: 0, physical: 0 }},
  { id: 'c4c89505-04c0-4f62-9686-2452cdf13256', name: 'Conductor', category: 'midfield',
    weights: { pace: 0, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 0 }},
  { id: '341d3deb-b40c-43a2-bb43-70d2ee78ce1b', name: 'Dynamo', category: 'midfield',
    weights: { pace: 1, shooting: 0, passing: 1, dribbling: 1, defending: 0, physical: 1 }},
  { id: 'ee15bfff-7911-4a1b-ae70-661569c4dcbe', name: 'Enforcer', category: 'midfield',
    weights: { pace: 0, shooting: 0, passing: 0, dribbling: 1, defending: 0, physical: 1 }},
  { id: '45c223d7-3de7-46f1-af30-9861fd26137b', name: 'Engine', category: 'midfield',
    weights: { pace: 1, shooting: 0, passing: 1, dribbling: 1, defending: 0, physical: 0 }},
  { id: 'c6716b40-6050-41b7-a78b-9a4b0d4b06f2', name: 'Leader', category: 'midfield',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 0, defending: 1, physical: 1 }},
  { id: '33f73992-1115-4f94-a141-b666424239ed', name: 'Legend', category: 'midfield',
    weights: { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 1 }},
  { id: '8c828370-ac09-4350-864f-aebc4bee6272', name: 'Locomotive', category: 'midfield',
    weights: { pace: 1, shooting: 0, passing: 0, dribbling: 0, defending: 0, physical: 1 }},
  { id: 'f50d01df-1901-4887-89b6-7a8c228aae1e', name: 'Maestro', category: 'midfield',
    weights: { pace: 0, shooting: 1, passing: 1, dribbling: 1, defending: 0, physical: 0 }},
  { id: '628bb7d6-cf26-4ee4-944c-2b87afa40302', name: 'Mastermind', category: 'midfield',
    weights: { pace: 0, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 1 }},
  { id: '74173611-c766-4a66-8fef-3e8efad27197', name: 'Orchestrator', category: 'midfield',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 1, defending: 0, physical: 0 }},
  { id: '8f076a5e-18b5-4601-b57d-9f984622a7ea', name: 'Playmaker', category: 'midfield',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 1, defending: 0, physical: 0 }},
  { id: '5a1e237b-e747-4bce-bf94-6e5f2c9e2f2d', name: 'Powerhouse', category: 'midfield',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 0, defending: 1, physical: 0 }},
  { id: '6553224c-8499-4d7c-8c23-fe00cff0b826', name: 'Powerplayer', category: 'midfield',
    weights: { pace: 1, shooting: 1, passing: 0, dribbling: 0, defending: 1, physical: 1 }},
  { id: '2409d027-8339-4335-9330-c9f84883a7dc', name: 'Regista', category: 'midfield',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 1, defending: 1, physical: 0 }},
  { id: 'f3796f78-a832-4496-afff-17a16567a0d6', name: 'Sprinter', category: 'midfield',
    weights: { pace: 1, shooting: 0, passing: 0, dribbling: 0, defending: 0, physical: 0 }},
  { id: 'b392ef95-9aa0-4f84-ae55-77a38f80d74e', name: 'Tactician', category: 'midfield',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 1, defending: 1, physical: 1 }},
  { id: 'a9b381e7-8d2d-4a5a-a044-a0e6f7daea6f', name: 'Technician', category: 'midfield',
    weights: { pace: 0, shooting: 1, passing: 1, dribbling: 1, defending: 0, physical: 0 }},
  { id: '185e04c6-3016-452c-b4f6-f27a699ab949', name: 'Virtuoso', category: 'midfield',
    weights: { pace: 1, shooting: 0, passing: 1, dribbling: 1, defending: 0, physical: 1 }},

  // Defensive styles (20 + 2 that were in the query result)
  { id: 'c99e86bc-a30d-49a7-b709-4f2e99836ba1', name: 'Anchor', category: 'defensive',
    weights: { pace: 1, shooting: 0, passing: 0, dribbling: 0, defending: 1, physical: 1 }},
  { id: '06794967-d4cb-4b4f-8f08-e6f1591cec83', name: 'Backbone', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 0, defending: 1, physical: 1 }},
  { id: '7b7816be-39df-41b8-9893-25d24bf85322', name: 'Ball Winner', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 1, physical: 1 }},
  { id: '60390bb3-be73-4836-98d8-bc55cd1e9598', name: 'Commander', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 0, defending: 1, physical: 1 }},
  { id: 'fabe8865-ad30-4d00-b17f-baa7afba10a6', name: 'Defender', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 1, physical: 0 }},
  { id: 'b76b4f0c-07f0-402f-8828-f00a4534cbb5', name: 'Destroyer', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 1, physical: 1 }},
  { id: '31ce58fc-dd22-4390-b6c1-f75d6364c7ad', name: 'General', category: 'defensive',
    weights: { pace: 1, shooting: 0, passing: 1, dribbling: 1, defending: 1, physical: 1 }},
  { id: '60dfeae6-1f4d-44dd-82e7-4becf13b9a8d', name: 'Gladiator', category: 'defensive',
    weights: { pace: 0, shooting: 1, passing: 0, dribbling: 0, defending: 1, physical: 0 }},
  { id: '6dcb1d90-3996-4372-b98b-8b2a9cf837ef', name: 'Guardian', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 0, dribbling: 1, defending: 1, physical: 0 }},
  { id: '1bcee34a-bbc0-4291-bba1-f3dbbea9aacf', name: 'Interceptor', category: 'defensive',
    weights: { pace: 1, shooting: 0, passing: 0, dribbling: 0, defending: 1, physical: 0 }},
  { id: '864ee073-b38f-4f0b-b609-35ca655479c6', name: 'Libero', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 1, dribbling: 1, defending: 1, physical: 0 }},
  { id: 'e205a70d-354b-4afc-a717-d74251c93aae', name: 'Machine', category: 'defensive',
    weights: { pace: 1, shooting: 0, passing: 0, dribbling: 0, defending: 1, physical: 1 }},
  { id: '68220d0a-793f-46e1-b023-7041ac496001', name: 'Sentinel', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 1, physical: 1 }},
  { id: '38298184-9fdb-44fe-855b-85846fd44676', name: 'Shadow', category: 'defensive',
    weights: { pace: 1, shooting: 0, passing: 0, dribbling: 0, defending: 1, physical: 0 }},
  { id: 'f7889b1a-85e7-4ca0-8b9c-430e04e82c6d', name: 'Stopper', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 0, dribbling: 1, defending: 1, physical: 1 }},
  { id: 'fd8753fe-4e6f-45ac-a58b-f277b3ea6177', name: 'Sweeper', category: 'defensive',
    weights: { pace: 1, shooting: 0, passing: 1, dribbling: 0, defending: 1, physical: 0 }},
  { id: '0abf8256-d4a0-4a98-82e7-7cac9cd787f6', name: 'Tank', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 1, physical: 1 }},
  { id: '5b68e96e-8a64-4d87-a4e3-7eaf33c27151', name: 'Terminator', category: 'defensive',
    weights: { pace: 1, shooting: 1, passing: 0, dribbling: 0, defending: 1, physical: 1 }},
  { id: '3b3b4b82-484d-47c7-9982-6308280e0d16', name: 'Titan', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 1, physical: 1 }},
  { id: '97d0a665-8b50-466d-816d-376ce38423c1', name: 'Warrior', category: 'defensive',
    weights: { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 1, physical: 1 }},
];

/**
 * Calculate similarity between player attributes and playstyle definition
 * Uses cosine similarity for better results with multi-dimensional comparison
 */
export function calculatePlaystyleSimilarity(
  playerAttributes: PlaystyleWeights,
  playstyleWeights: PlaystyleWeights
): number {
  // Calculate dot product
  let dotProduct = 0;
  let playerMagnitude = 0;
  let playstyleMagnitude = 0;

  const attributes = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const;

  for (const attr of attributes) {
    const playerVal = playerAttributes[attr];
    const playstyleVal = playstyleWeights[attr];

    dotProduct += playerVal * playstyleVal;
    playerMagnitude += playerVal * playerVal;
    playstyleMagnitude += playstyleVal * playstyleVal;
  }

  playerMagnitude = Math.sqrt(playerMagnitude);
  playstyleMagnitude = Math.sqrt(playstyleMagnitude);

  // Handle zero vectors
  if (playerMagnitude === 0 || playstyleMagnitude === 0) {
    return 0;
  }

  // Return cosine similarity (ranges from 0 to 1 for non-negative values)
  return dotProduct / (playerMagnitude * playstyleMagnitude);
}

/**
 * Find the best matching playstyle for a player's averaged attributes
 */
export function findBestMatchingPlaystyle(
  playerAttributes: PlaystyleWeights,
  minSimilarity: number = 0
): { playstyle: PlaystyleDefinition; similarity: number } | null {
  let bestMatch: PlaystyleDefinition | null = null;
  let bestSimilarity = minSimilarity;

  for (const playstyle of PLAYSTYLE_DEFINITIONS) {
    const similarity = calculatePlaystyleSimilarity(playerAttributes, playstyle.weights);

    if (similarity > bestSimilarity) {
      bestMatch = playstyle;
      bestSimilarity = similarity;
    }
  }

  if (!bestMatch) {
    return null;
  }

  return {
    playstyle: bestMatch,
    similarity: bestSimilarity
  };
}