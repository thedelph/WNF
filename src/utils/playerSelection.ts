import { supabaseAdmin } from '../utils/supabase';
import { calculatePlayerXP } from './playerUtils';
import { shuffleArray } from './arrayUtils';

export interface PlayerSelectionParams {
  gameId: string;
  maxPlayers: number;
  randomSlots: number;
}

interface PlayerWithXP {
  id: string;
  player_id: string;
  friendly_name: string;
  xp: number;
  stats: {
    caps: number;
    activeBonuses: number;
    activePenalties: number;
    currentStreak: number;
  };
}

export interface PlayerSelectionResult {
  selectedPlayers: Array<{
    id: string;
    friendly_name: string;
    isRandomlySelected: boolean;
    xp: number;
    stats: {
      caps: number;
      activeBonuses: number;
      activePenalties: number;
      currentStreak: number;
    };
  }>;
  reservePlayers: Array<{
    id: string;
    friendly_name: string;
    xp: number;
    stats: {
      caps: number;
      activeBonuses: number;
      activePenalties: number;
      currentStreak: number;
    };
  }>;
  debug: SelectionDebugInfo;
}

export const handlePlayerSelection = async ({
  gameId,
  maxPlayers,
  randomSlots
}: PlayerSelectionParams): Promise<PlayerSelectionResult> => {
  const startTime = new Date().toISOString();

  try {
    // Reset all registrations to 'registered' status
    await supabaseAdmin
      .from('game_registrations')
      .update({ 
        status: 'registered',
        randomly_selected: false 
      })
      .eq('game_id', gameId);

    // Fetch all registrations
    const { data: registrations, error: fetchError } = await supabaseAdmin
      .from('game_registrations')
      .select(`
        id,
        player_id,
        player:players!game_registrations_player_id_fkey (
          id,
          friendly_name,
          caps,
          active_bonuses,
          active_penalties,
          current_streak
        )
      `)
      .eq('game_id', gameId)
      .eq('status', 'registered');

    if (fetchError) {
      console.error('Player selection fetch error:', fetchError);
      throw fetchError;
    }

    // Calculate XP for each player using the proper XP calculation
    const playersWithXP: PlayerWithXP[] = registrations.map(reg => ({
      id: reg.id,
      player_id: reg.player_id,
      friendly_name: reg.player.friendly_name,
      stats: {
        caps: reg.player.caps,
        activeBonuses: reg.player.active_bonuses,
        activePenalties: reg.player.active_penalties,
        currentStreak: reg.player.current_streak
      },
      xp: calculatePlayerXP({
        caps: reg.player.caps,
        activeBonuses: reg.player.active_bonuses,
        activePenalties: reg.player.active_penalties,
        currentStreak: reg.player.current_streak
      })
    }));

    // Sort players by calculated XP descending
    const sortedPlayers = [...playersWithXP].sort((a, b) => b.xp - a.xp);

    const meritSlots = maxPlayers - randomSlots;
    
    // Select merit-based players
    let selectedPlayers: PlayerWithXP[] = [];
    let currentXP = Infinity;
    let tiedPlayers: PlayerWithXP[] = [];

    for (const player of sortedPlayers) {
      if (selectedPlayers.length < meritSlots) {
        // If this player's XP is different from current group
        if (player.xp !== currentXP) {
          // Process previous tied players
          if (selectedPlayers.length + tiedPlayers.length <= meritSlots) {
            selectedPlayers.push(...tiedPlayers);
          } else {
            const remainingSlots = meritSlots - selectedPlayers.length;
            const randomlySelectedTied = shuffleArray(tiedPlayers).slice(0, remainingSlots);
            selectedPlayers.push(...randomlySelectedTied);
          }
          // Reset for new XP level
          tiedPlayers = [];
          currentXP = player.xp;
        }
        tiedPlayers.push(player);
      } else {
        break;
      }
    }

    // Handle any remaining tied players at the cutoff
    if (selectedPlayers.length < meritSlots) {
      const remainingSlots = meritSlots - selectedPlayers.length;
      const randomlySelectedTied = shuffleArray(tiedPlayers).slice(0, remainingSlots);
      selectedPlayers.push(...randomlySelectedTied);
    }

    // Prepare random selection pool
    const randomPool = sortedPlayers.filter(p => !selectedPlayers.some(sp => sp.id === p.id));
    
    // Randomly select remaining players
    const randomlySelected = shuffleArray(randomPool).slice(0, randomSlots);

    // Combine merit and random selections
    const finalSelectedPlayers = [...selectedPlayers, ...randomlySelected];
    const reservePlayers = sortedPlayers.filter(p => !finalSelectedPlayers.some(sp => sp.id === p.id));

    // Update database with results
    const updatePromises = [
      ...finalSelectedPlayers.map(p => 
        supabaseAdmin
          .from('game_registrations')
          .update({ 
            status: 'selected', 
            randomly_selected: randomlySelected.some(rp => rp.id === p.id) 
          })
          .eq('id', p.id)
      ),
      ...reservePlayers.map(p => 
        supabaseAdmin
          .from('game_registrations')
          .update({ status: 'reserve' })
          .eq('id', p.id)
      )
    ];

    await Promise.all(updatePromises);

    // Prepare debug info
    const debugInfo: SelectionDebugInfo = {
      timestamp: startTime,
      gameDetails: {
        id: gameId,
        maxPlayers,
        randomSlots,
        meritSlots
      },
      xpAnalysis: {
        highestXP: sortedPlayers[0].xp,
        lowestXP: sortedPlayers[sortedPlayers.length - 1].xp,
        averageXP: sortedPlayers.reduce((sum, p) => sum + p.xp, 0) / sortedPlayers.length,
        xpCutoff: selectedPlayers[selectedPlayers.length - 1].xp,
        tiedPlayersAtCutoff: tiedPlayers.map(p => ({
          name: p.friendly_name,
          xp: p.xp,
          selected: finalSelectedPlayers.some(sp => sp.id === p.id),
          reason: finalSelectedPlayers.some(sp => sp.id === p.id) ? "Selected in tie-break" : "Not selected in tie-break"
        }))
      },
      selectionSteps: [
        {
          step: "1. Initial Sort",
          description: `Sorted ${sortedPlayers.length} players by XP`,
          timestamp: new Date().toISOString()
        },
        {
          step: "2. Merit Selection",
          description: `Selected top ${meritSlots} players by XP, handling ties`,
          affectedPlayers: selectedPlayers.map(p => p.friendly_name),
          timestamp: new Date().toISOString()
        },
        {
          step: "3. Random Selection",
          description: `Randomly selected ${randomSlots} players from remaining pool`,
          affectedPlayers: randomlySelected.map(p => p.friendly_name),
          timestamp: new Date().toISOString()
        }
      ],
      playerDecisions: sortedPlayers.map(p => ({
        name: p.friendly_name,
        xp: p.xp,
        status: finalSelectedPlayers.some(sp => sp.id === p.id) ? "selected" : "reserve",
        selectionType: selectedPlayers.some(sp => sp.id === p.id) ? "merit" : 
                       randomlySelected.some(rp => rp.id === p.id) ? "random" : "reserve",
        reason: determineSelectionReason(p, selectedPlayers, randomlySelected, selectedPlayers[selectedPlayers.length - 1].xp)
      })),
      statistics: {
        xpDistribution: calculateXPDistribution(sortedPlayers),
        averages: {
          selectedPlayersAvgXP: finalSelectedPlayers.reduce((sum, p) => sum + p.xp, 0) / finalSelectedPlayers.length,
          reservePlayersAvgXP: reservePlayers.reduce((sum, p) => sum + p.xp, 0) / reservePlayers.length,
          overallAvgXP: sortedPlayers.reduce((sum, p) => sum + p.xp, 0) / sortedPlayers.length
        },
        randomSelection: {
          totalEligible: randomPool.length,
          selectionProbability: randomSlots / randomPool.length,
          selectedCount: randomlySelected.length
        }
      },
      timing: {
        selectionStart: startTime,
        selectionEnd: new Date().toISOString(),
        totalDuration: new Date().getTime() - new Date(startTime).getTime()
      }
    };

    return {
      selectedPlayers: finalSelectedPlayers.map(p => ({
        id: p.id,
        friendly_name: p.friendly_name,
        isRandomlySelected: randomlySelected.some(rp => rp.id === p.id),
        xp: p.xp,
        stats: p.stats
      })),
      reservePlayers: reservePlayers.map(p => ({
        id: p.id,
        friendly_name: p.friendly_name,
        xp: p.xp,
        stats: p.stats
      })),
      debug: debugInfo
    };

  } catch (error) {
    console.error('Error in player selection:', error);
    throw error;
  }
};

function determineSelectionReason(
  player: PlayerWithXP,
  meritPlayers: PlayerWithXP[],
  randomlySelected: PlayerWithXP[],
  cutoffXP: number
): string {
  if (meritPlayers.some(mp => mp.id === player.id)) {
    return player.xp > cutoffXP ? 
      `Selected by merit - ${player.xp} XP above cutoff` :
      `Selected by merit - won tie-break at ${player.xp} XP cutoff`;
  }
  
  if (randomlySelected.some(rs => rs.id === player.id)) {
    return `Selected for random slot from pool of ${randomlySelected.length} players`;
  }
  
  return player.xp >= cutoffXP ?
    `Reserve - lost tie-break at ${player.xp} XP cutoff for merit slot` :
    `Reserve - ${player.xp} XP below merit cutoff (${cutoffXP}), not selected in random draw`;
}

function calculateXPDistribution(players: PlayerWithXP[]): Record<number, number> {
  return players.reduce((acc, p) => {
    acc[p.xp] = (acc[p.xp] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
}

