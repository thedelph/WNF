import { PlayerWithRating } from '../../components/admin/team-balancing/tierBasedSnakeDraft';

export interface ParsedDebugData {
  executiveSummary: {
    totalPlayers: number;
    ratedPlayers: number;
    newPlayers: number;
    tierCount: number;
    tierSizes: string;
    finalBalance: number;
    balanceQuality: string;
    optimizationSwaps: number;
    advantage: string;
  };
  playerTransformations: Array<{
    name: string;
    baseSkill: number;
    threeLayerRating: number;
    change: number;
    performanceCategory: string;
    momentum: 'hot' | 'cold' | 'steady';
    overallWinRate?: number;
    recentWinRate?: number;
    overallGoalDiff?: number;
    recentGoalDiff?: number;
  }>;
  tierData: Array<{
    tierNumber: number;
    players: Array<{
      name: string;
      rating: number;
    }>;
    skillRange: { min: number; max: number };
  }>;
  snakeDraftPicks: Array<{
    tier: number;
    picks: Array<{ 
      player: string; 
      team: 'blue' | 'orange'; 
      pickNumber: number;
      rating: number;
    }>;
  }>;
  balanceBreakdown: {
    metrics: Array<{
      name: string;
      blueValue: number;
      orangeValue: number;
      difference: number;
    }>;
    overallBalance: number;
    description: string;
  };
  optimizationSwaps: Array<{
    bluePlayer: string;
    orangePlayer: string;
    tier: number;
    improvement: number;
    reason?: string;
    metricChanges?: {
      attack?: { before: number; after: number };
      defense?: { before: number; after: number };
      gameIq?: { before: number; after: number };
      pace?: { before: number; after: number };
      shooting?: { before: number; after: number };
      passing?: { before: number; after: number };
      dribbling?: { before: number; after: number };
      defending?: { before: number; after: number };
      physical?: { before: number; after: number };
      winRateGap?: { before: number; after: number };
    };
  }>;
  keyInsights: {
    majorBoosts: Array<{ player: string; boost: number; reason: string }>;
    majorDrops: Array<{ player: string; drop: number; reason: string }>;
    hotStreaks: Array<{ player: string; winRateChange: number }>;
    coldStreaks: Array<{ player: string; winRateChange: number }>;
    performanceMismatches: Array<{ player: string; category: string; description: string }>;
  };
  draftAnalysis: {
    bestValuePicks: Array<{ player: string; tier: number; value: number }>;
    potentialReaches: Array<{ player: string; tier: number; reason: string }>;
  };
  teamComposition: {
    byTier: Array<{
      tier: number;
      blueCount: number;
      orangeCount: number;
    }>;
    experienceDistribution: {
      blue: { rated: number; new: number };
      orange: { rated: number; new: number };
    };
  };
  blueTeam?: PlayerWithRating[];
  orangeTeam?: PlayerWithRating[];
}

export function parseDebugLog(debugLog: string): ParsedDebugData {
  const data: ParsedDebugData = {
    executiveSummary: {
      totalPlayers: 0,
      ratedPlayers: 0,
      newPlayers: 0,
      tierCount: 0,
      tierSizes: '',
      finalBalance: 0,
      balanceQuality: '',
      optimizationSwaps: 0,
      advantage: ''
    },
    playerTransformations: [],
    tierData: [],
    snakeDraftPicks: [],
    balanceBreakdown: {
      metrics: [],
      overallBalance: 0,
      description: ''
    },
    optimizationSwaps: [],
    keyInsights: {
      majorBoosts: [],
      majorDrops: [],
      hotStreaks: [],
      coldStreaks: [],
      performanceMismatches: []
    },
    draftAnalysis: {
      bestValuePicks: [],
      potentialReaches: []
    },
    teamComposition: {
      byTier: [],
      experienceDistribution: {
        blue: { rated: 0, new: 0 },
        orange: { rated: 0, new: 0 }
      }
    }
  };

  // Parse executive summary
  const summaryMatch = debugLog.match(/EXECUTIVE SUMMARY[\s\S]*?Advantage: ([^\n]+)/);
  if (summaryMatch) {
    const summaryText = summaryMatch[0];
    data.executiveSummary.totalPlayers = parseInt(summaryText.match(/Players: (\d+)/)?.[1] || '0');
    data.executiveSummary.ratedPlayers = parseInt(summaryText.match(/\((\d+) rated/)?.[1] || '0');
    data.executiveSummary.newPlayers = parseInt(summaryText.match(/, (\d+) new\)/)?.[1] || '0');
    data.executiveSummary.tierCount = parseInt(summaryText.match(/Tiers: (\d+)/)?.[1] || '0');
    data.executiveSummary.tierSizes = summaryText.match(/\(sizes: ([^)]+)\)/)?.[1] || '';
    data.executiveSummary.finalBalance = parseFloat(summaryText.match(/Final Balance: ([\d.]+)/)?.[1] || '0');
    data.executiveSummary.balanceQuality = summaryText.match(/\((Excellent|Good|Fair|Poor)/)?.[1] || '';
    data.executiveSummary.optimizationSwaps = parseInt(summaryText.match(/Optimization: (\d+) swap/)?.[1] || '0');
    data.executiveSummary.advantage = summaryMatch[1];
  }

  // Parse player calculations for transformation data
  const calcSection = debugLog.match(/STEP 1: CALCULATING PLAYER RATINGS[\s\S]*?(?=STEP 2:|STEP 2\.|PLAYER TRANSFORMATION TABLE|$)/);
  if (calcSection) {
    console.log('Found calc section, length:', calcSection[0].length);
    const playerBlocks = calcSection[0].split(/\nPlayer: /);
    console.log('Found player blocks:', playerBlocks.length);
    
    playerBlocks.forEach((block, index) => {
      if (index === 0 || !block.trim()) return;
      
      const lines = block.split('\n');
      const name = lines[0].trim();
      console.log('Processing player:', name);
      
      // Extract values from the block
      const baseSkillMatch = block.match(/Base Skill Rating: ([\d.]+)/);
      const threeLayerMatch = block.match(/Three-Layer Rating: ([\d.]+)/);
      const overallMatch = block.match(/Overall: ([\d.]+)% win rate, ([+-]?\d+) goal diff/);
      const recentMatch = block.match(/Recent: ([\d.]+)% win rate, ([+-]?\d+) goal diff/);
      const momentumMatch = block.match(/Momentum: [+-]?([\d.]+) \((hot|cold|steady)/);
      
      if (baseSkillMatch && threeLayerMatch) {
        const baseSkill = parseFloat(baseSkillMatch[1]);
        const threeLayerRating = parseFloat(threeLayerMatch[1]);
        
        data.playerTransformations.push({
          name,
          baseSkill,
          threeLayerRating,
          change: threeLayerRating - baseSkill,
          performanceCategory: '',
          momentum: momentumMatch ? momentumMatch[2] as any : 'steady',
          overallWinRate: overallMatch ? parseFloat(overallMatch[1]) : undefined,
          recentWinRate: recentMatch ? parseFloat(recentMatch[1]) : undefined,
          overallGoalDiff: overallMatch ? parseInt(overallMatch[2]) : undefined,
          recentGoalDiff: recentMatch ? parseInt(recentMatch[2]) : undefined
        });
      } else {
        console.log('Missing data for player:', name, 'baseSkill:', baseSkillMatch, 'threeLayer:', threeLayerMatch);
      }
    });
  } else {
    console.log('No calc section found');
  }

  console.log('Total transformations parsed:', data.playerTransformations.length);

  // Alternative: Try parsing from PLAYER TRANSFORMATION TABLE
  if (data.playerTransformations.length === 0) {
    console.log('Trying alternative parsing from PLAYER TRANSFORMATION TABLE');
    const tableSection = debugLog.match(/PLAYER TRANSFORMATION TABLE[\s\S]*?(?=COMPACT TRANSFORMATION|KEY INSIGHTS|$)/);
    if (tableSection) {
      const lines = tableSection[0].split('\n');
      let inDataSection = false;
      
      lines.forEach(line => {
        if (line.includes('----------')) {
          inDataSection = true;
          return;
        }
        
        if (!inDataSection || !line.trim() || line.includes('COMPACT')) return;
        
        // Parse table row - format: Player Name | Base | Overall | Recent | Momentum | Final | Change
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 6) {
          const name = parts[0];
          const baseSkillStr = parts[1];
          const finalStr = parts[5];
          const changeStr = parts[6];
          
          // Extract numeric values
          const baseSkill = parseFloat(baseSkillStr);
          const finalRating = parseFloat(finalStr);
          
          if (!isNaN(baseSkill) && !isNaN(finalRating) && name && name !== 'Player') {
            // Determine momentum from the line
            let momentum: 'hot' | 'cold' | 'steady' = 'steady';
            if (line.includes('hot') || parts[4]?.includes('hot')) momentum = 'hot';
            else if (line.includes('cold') || parts[4]?.includes('cold')) momentum = 'cold';
            
            data.playerTransformations.push({
              name,
              baseSkill,
              threeLayerRating: finalRating,
              change: finalRating - baseSkill,
              performanceCategory: '',
              momentum
            });
          }
        }
      });
      console.log('Alternative parsing found:', data.playerTransformations.length, 'players');
    }
  }

  // Parse key insights
  const insightsSection = debugLog.match(/KEY INSIGHTS:[\s\S]*?(?=STEP \d+:|$)/);
  if (insightsSection) {
    // Major rating boosts
    const boostsSection = insightsSection[0].match(/Major Rating Boosts[^:]*:([\s\S]*?)(?=\n\n|Major Rating Drops|Hot Streaks)/);
    if (boostsSection) {
      const boostMatches = boostsSection[1].matchAll(/- ([^:]+): \+([\d.]+) \(([^)]+)\)/g);
      for (const match of boostMatches) {
        data.keyInsights.majorBoosts.push({
          player: match[1].trim(),
          boost: parseFloat(match[2]),
          reason: match[3]
        });
      }
    }

    // Major rating drops
    const dropsSection = insightsSection[0].match(/Major Rating Drops[^:]*:([\s\S]*?)(?=\n\n|Hot Streaks|Performance)/);
    if (dropsSection) {
      const dropMatches = dropsSection[1].matchAll(/- ([^:]+): -([\d.]+) \(([^)]+)\)/g);
      for (const match of dropMatches) {
        data.keyInsights.majorDrops.push({
          player: match[1].trim(),
          drop: parseFloat(match[2]),
          reason: match[3]
        });
      }
    }

    // Hot streaks
    const hotSection = insightsSection[0].match(/Hot Streaks 🔥:([\s\S]*?)(?=Cold Streaks|Performance|$)/);
    if (hotSection) {
      const hotMatches = hotSection[1].matchAll(/- ([^:]+): recent ([\d.]+)% vs overall ([\d.]+)%/g);
      for (const match of hotMatches) {
        data.keyInsights.hotStreaks.push({
          player: match[1].trim(),
          winRateChange: parseFloat(match[2]) - parseFloat(match[3])
        });
      }
    }

    // Cold streaks
    const coldSection = insightsSection[0].match(/Cold Streaks ❄️:([\s\S]*?)(?=Performance|$)/);
    if (coldSection) {
      const coldMatches = coldSection[1].matchAll(/- ([^:]+): recent ([\d.]+)% vs overall ([\d.]+)%/g);
      for (const match of coldMatches) {
        data.keyInsights.coldStreaks.push({
          player: match[1].trim(),
          winRateChange: parseFloat(match[2]) - parseFloat(match[3])
        });
      }
    }
  }

  // Parse tier data
  const tierSection = debugLog.match(/STEP 3: CREATING TIERS[\s\S]*?(?=STEP 4:|$)/);
  if (tierSection) {
    const tierMatches = tierSection[0].matchAll(/Tier (\d+) \((\d+) players, range: ([\d.]+)-([\d.]+)\):([\s\S]*?)(?=Tier \d+|$)/g);
    for (const match of tierMatches) {
      const tierNum = parseInt(match[1]);
      const minSkill = parseFloat(match[3]);
      const maxSkill = parseFloat(match[4]);
      const playersList = match[5];
      
      const players: Array<{ name: string; rating: number }> = [];
      const playerMatches = playersList.matchAll(/- ([^(]+) \(([\d.]+)\)/g);
      for (const pm of playerMatches) {
        players.push({
          name: pm[1].trim(),
          rating: parseFloat(pm[2])
        });
      }
      
      data.tierData.push({
        tierNumber: tierNum,
        players,
        skillRange: { min: minSkill, max: maxSkill }
      });
    }
  }

  // Parse snake draft picks
  const draftSection = debugLog.match(/STEP 4: SNAKE DRAFT PROCESS[\s\S]*?(?=STEP 5:|Initial Balance:|$)/);
  if (draftSection) {
    const tierDraftMatches = draftSection[0].matchAll(/Tier (\d+) Draft:([\s\S]*?)(?=Tier \d+ Draft:|Current totals:|Initial Balance:|$)/g);
    let globalPickNumber = 0;
    
    for (const tierMatch of tierDraftMatches) {
      const tierNum = parseInt(tierMatch[1]);
      const draftContent = tierMatch[2];
      const picks: Array<{ player: string; team: 'blue' | 'orange'; pickNumber: number; rating: number }> = [];
      
      const pickMatches = draftContent.matchAll(/Pick \d+: ([^→]+) → (Blue|Orange)/g);
      for (const pickMatch of pickMatches) {
        globalPickNumber++;
        const playerName = pickMatch[1].trim();
        
        // Find player rating from tier data
        let rating = 0;
        for (const tier of data.tierData) {
          const player = tier.players.find(p => p.name === playerName);
          if (player) {
            rating = player.rating;
            break;
          }
        }
        
        picks.push({
          player: playerName,
          team: pickMatch[2].toLowerCase() as 'blue' | 'orange',
          pickNumber: globalPickNumber,
          rating
        });
      }
      
      if (picks.length > 0) {
        data.snakeDraftPicks.push({ tier: tierNum, picks });
      }
    }
  }

  // Parse balance breakdown
  const balanceSection = debugLog.match(/TEAM BALANCE BREAKDOWN[\s\S]*?(?=TEAM STRENGTH|$)/);
  if (balanceSection) {
    const lines = balanceSection[0].split('\n');
    lines.forEach(line => {
      const metricMatch = line.match(/(Attack|Defense|Game IQ|Win Rate|Goal Diff):\s+([\d.+-]+%?)\s+([\d.+-]+%?)\s+([\d.]+%?)/);
      if (metricMatch) {
        data.balanceBreakdown.metrics.push({
          name: metricMatch[1],
          blueValue: parseFloat(metricMatch[2].replace('%', '')),
          orangeValue: parseFloat(metricMatch[3].replace('%', '')),
          difference: parseFloat(metricMatch[4].replace('%', ''))
        });
      }
    });
    
    const balanceScoreMatch = balanceSection[0].match(/Overall Balance Score: ([\d.]+) \(([^)]+)\)/);
    if (balanceScoreMatch) {
      data.balanceBreakdown.overallBalance = parseFloat(balanceScoreMatch[1]);
      data.balanceBreakdown.description = balanceScoreMatch[2];
    }
  }

  // Parse optimization swaps from execution logs
  const executingSwapMatches = debugLog.matchAll(/Executing (same-tier|cross-tier) swap: ([^↔]+) ↔ ([^\n]+)[\s\S]*?Balance improved: ([\d.]+) → ([\d.]+)([\s\S]*?)(?=Executing|Tier \d+ optimization complete|Integrated optimization complete|$)/g);
  for (const match of executingSwapMatches) {
    const bluePlayerMatch = match[2].match(/([^(]+)(?:\(T\d+\))?/);
    const orangePlayerMatch = match[3].match(/([^(]+)(?:\(T\d+\))?/);

    if (bluePlayerMatch && orangePlayerMatch) {
      const swap: any = {
        bluePlayer: bluePlayerMatch[1].trim(),
        orangePlayer: orangePlayerMatch[1].trim(),
        tier: 0, // Will be filled from KEY DECISIONS or OPTIMIZATION IMPACT
        improvement: parseFloat(match[4]) - parseFloat(match[5]), // before - after
        metricChanges: {}
      };

      // Parse metric changes from the captured section
      const metricSection = match[6];

      // Parse core skill changes
      const attackMatch = metricSection.match(/Attack: ([\d.]+) → ([\d.]+)/);
      if (attackMatch) {
        swap.metricChanges.attack = { before: parseFloat(attackMatch[1]), after: parseFloat(attackMatch[2]) };
      }

      const defenseMatch = metricSection.match(/Defense: ([\d.]+) → ([\d.]+)/);
      if (defenseMatch) {
        swap.metricChanges.defense = { before: parseFloat(defenseMatch[1]), after: parseFloat(defenseMatch[2]) };
      }

      const gameIqMatch = metricSection.match(/Game IQ: ([\d.]+) → ([\d.]+)/);
      if (gameIqMatch) {
        swap.metricChanges.gameIq = { before: parseFloat(gameIqMatch[1]), after: parseFloat(gameIqMatch[2]) };
      }

      // Parse attribute changes
      const paceMatch = metricSection.match(/Pace: ([\d.]+) → ([\d.]+)/);
      if (paceMatch) {
        swap.metricChanges.pace = { before: parseFloat(paceMatch[1]), after: parseFloat(paceMatch[2]) };
      }

      const shootingMatch = metricSection.match(/Shooting: ([\d.]+) → ([\d.]+)/);
      if (shootingMatch) {
        swap.metricChanges.shooting = { before: parseFloat(shootingMatch[1]), after: parseFloat(shootingMatch[2]) };
      }

      const passingMatch = metricSection.match(/Passing: ([\d.]+) → ([\d.]+)/);
      if (passingMatch) {
        swap.metricChanges.passing = { before: parseFloat(passingMatch[1]), after: parseFloat(passingMatch[2]) };
      }

      const dribblingMatch = metricSection.match(/Dribbling: ([\d.]+) → ([\d.]+)/);
      if (dribblingMatch) {
        swap.metricChanges.dribbling = { before: parseFloat(dribblingMatch[1]), after: parseFloat(dribblingMatch[2]) };
      }

      const defendingMatch = metricSection.match(/Defending: ([\d.]+) → ([\d.]+)/);
      if (defendingMatch) {
        swap.metricChanges.defending = { before: parseFloat(defendingMatch[1]), after: parseFloat(defendingMatch[2]) };
      }

      const physicalMatch = metricSection.match(/Physical: ([\d.]+) → ([\d.]+)/);
      if (physicalMatch) {
        swap.metricChanges.physical = { before: parseFloat(physicalMatch[1]), after: parseFloat(physicalMatch[2]) };
      }

      const winRateMatch = metricSection.match(/Win Rate Gap: ([\d.]+)% → ([\d.]+)%/);
      if (winRateMatch) {
        swap.metricChanges.winRateGap = { before: parseFloat(winRateMatch[1]), after: parseFloat(winRateMatch[2]) };
      }

      data.optimizationSwaps.push(swap);
    }
  }

  // Try to get tier information from OPTIMIZATION IMPACT section
  const optimizationSection = debugLog.match(/OPTIMIZATION IMPACT[\s\S]*?(?=KEY DECISIONS|DRAFT VALUE|$)/);
  if (optimizationSection) {
    const swapLines = optimizationSection[0].match(/\d+\. ([^(]+) \(Blue\) ↔ ([^(]+) \(Orange\)[\s\S]*?Tier: (\d+)/g) || [];
    swapLines.forEach((swapLine, index) => {
      const match = swapLine.match(/\d+\. ([^(]+) \(Blue\) ↔ ([^(]+) \(Orange\)[\s\S]*?Tier: (\d+)/);
      if (match && index < data.optimizationSwaps.length) {
        data.optimizationSwaps[index].tier = parseInt(match[3]);
      }
    });
  }

  // Parse key decisions for swap reasons
  const decisionsSection = debugLog.match(/KEY DECISIONS[\s\S]*?(?=DRAFT VALUE|$)/);
  if (decisionsSection && data.optimizationSwaps.length > 0) {
    const decisionMatches = decisionsSection[0].matchAll(/Swap \d+: ([^↔]+) ↔ ([^\n]+)\n\s*Why: ([^\n]+)/g);
    let swapIndex = 0;
    for (const match of decisionMatches) {
      if (swapIndex < data.optimizationSwaps.length) {
        data.optimizationSwaps[swapIndex].reason = match[3];
        swapIndex++;
      }
    }
  }

  // Parse draft value analysis
  const draftValueSection = debugLog.match(/DRAFT VALUE ANALYSIS[\s\S]*?(?=TEAM COMPOSITION|$)/);
  if (draftValueSection) {
    // Best value picks
    const valueSection = draftValueSection[0].match(/Best Value Picks[^:]*:([\s\S]*?)(?=Potential Reaches|Performance Adjustments|$)/);
    if (valueSection) {
      const valueMatches = valueSection[1].matchAll(/- ([^:]+): Tier (\d+), rated ([\d.]+) \(avg: ([\d.]+)\)/g);
      for (const match of valueMatches) {
        const rating = parseFloat(match[3]);
        const avgRating = parseFloat(match[4]);
        data.draftAnalysis.bestValuePicks.push({
          player: match[1].trim(),
          tier: parseInt(match[2]),
          value: rating - avgRating
        });
      }
    }

    // Potential reaches
    const reachSection = draftValueSection[0].match(/Potential Reaches[^:]*:([\s\S]*?)(?=Performance Adjustments|$)/);
    if (reachSection) {
      const reachMatches = reachSection[1].matchAll(/- ([^:]+): Tier (\d+) \(([^)]+)\)/g);
      for (const match of reachMatches) {
        data.draftAnalysis.potentialReaches.push({
          player: match[1].trim(),
          tier: parseInt(match[2]),
          reason: match[3]
        });
      }
    }
  }

  // Parse team composition by tier
  const compositionSection = debugLog.match(/TEAM COMPOSITION BY TIER[\s\S]*$/);
  if (compositionSection) {
    const tierCompMatches = compositionSection[0].matchAll(/Tier (\d+): [🔵🟠 ]+ \((\d+)B\/(\d+)O\)/g);
    for (const match of tierCompMatches) {
      data.teamComposition.byTier.push({
        tier: parseInt(match[1]),
        blueCount: parseInt(match[2]),
        orangeCount: parseInt(match[3])
      });
    }
  }

  return data;
}