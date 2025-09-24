// Test script for similarity-based playstyle detection
import { findBestMatchingPlaystyle } from './src/utils/teamBalancing/playstyleDefinitions.js';

// Test cases based on actual player data
const testPlayers = [
  {
    name: 'Tom K',
    attributes: { pace: 0.33, shooting: 1.00, passing: 0.00, dribbling: 0.00, defending: 0.00, physical: 0.67 }
  },
  {
    name: 'James H',
    attributes: { pace: 0.00, shooting: 0.00, passing: 0.00, dribbling: 0.00, defending: 1.00, physical: 1.00 }
  },
  {
    name: 'Chris H',
    attributes: { pace: 0.50, shooting: 0.00, passing: 1.00, dribbling: 0.00, defending: 0.50, physical: 0.00 }
  },
  {
    name: 'Dave',
    attributes: { pace: 1.00, shooting: 0.00, passing: 0.50, dribbling: 0.50, defending: 0.50, physical: 1.00 }
  },
  {
    name: 'Simon',
    attributes: { pace: 0.67, shooting: 1.00, passing: 1.00, dribbling: 1.00, defending: 1.00, physical: 1.00 }
  }
];

console.log('=== Similarity-Based Playstyle Detection Test ===\n');

for (const player of testPlayers) {
  const match = findBestMatchingPlaystyle(player.attributes, 0);

  if (match) {
    console.log(`${player.name}:`);
    console.log(`  Matched: ${match.playstyle.name} (${match.playstyle.category})`);
    console.log(`  Similarity: ${(match.similarity * 100).toFixed(1)}%`);
    console.log(`  Player attrs: PAC:${player.attributes.pace} SHO:${player.attributes.shooting} PAS:${player.attributes.passing} DRI:${player.attributes.dribbling} DEF:${player.attributes.defending} PHY:${player.attributes.physical}`);
    console.log(`  Match attrs:  PAC:${match.playstyle.weights.pace} SHO:${match.playstyle.weights.shooting} PAS:${match.playstyle.weights.passing} DRI:${match.playstyle.weights.dribbling} DEF:${match.playstyle.weights.defending} PHY:${match.playstyle.weights.physical}`);
    console.log('');
  } else {
    console.log(`${player.name}: No match found\n`);
  }
}