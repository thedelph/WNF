import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Game, GAME_STATUSES } from '../../../types/game';
import { format } from 'date-fns';
import { FaWhatsapp } from 'react-icons/fa';
import { MdPauseCircle } from 'react-icons/md';
import toast from 'react-hot-toast';
import { supabase, supabaseAdmin } from '../../../utils/supabase';

interface Props {
  game: Game;
  onEditClick: (game: Game) => void;
  onViewRegistrations: (gameId: string) => void;
  onDeleteClick: (gameId: string) => void;
}

interface SimulationResult {
  tokenPlayers: any[]
  meritPlayers: any[]
  randomPlayers: any[]
  reservePlayers: any[]
  tokenUsersSavedByMerit: any[]
}

export const GameCard: React.FC<Props> = ({
  game,
  onEditClick,
  onViewRegistrations,
  onDeleteClick,
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const formatDate = (date: string) => {
    return format(new Date(date), 'PPP p');
  };

  const formatWhatsAppDate = (date: string) => {
    return format(new Date(date), 'EEEE do MMMM');
  };

  const formatWhatsAppTime = (date: string) => {
    return format(new Date(date), 'h:mmaaa').toLowerCase();
  };

  /**
   * Handles the WhatsApp share functionality.
   * 
   * This function:
   * 1. Fetches WhatsApp group members from the players table
   * 2. Queries token status data from the public_player_token_status view
   * 3. Determines which players are eligible for tokens based on eligibility criteria:
   *    - Player must have played in at least one of the last 10 games
   *    - Player must NOT have been selected in any of the last 3 games
   *    - Player must NOT have any outstanding payments
   * 4. Formats a WhatsApp message including:
   *    - Game details (date, time, location)
   *    - List of eligible players who can use tokens
   *    - Game status-specific information
   * 
   * Note: The WhatsApp message shows players who are ELIGIBLE to USE tokens,
   * not players who already have active tokens. Eligibility is determined by 
   * the public_player_token_status view.
   */
  const handleWhatsAppShare = async () => {
    try {
      console.log('Starting WhatsApp share process');

      // First, get all WhatsApp group members
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, friendly_name, whatsapp_group_member')
        .in('whatsapp_group_member', ['Yes', 'Proxy'])
        .order('friendly_name');

      if (playersError) {
        console.error('Error fetching players:', playersError);
        toast.error('Failed to get player data');
        return;
      }
      console.log(`Fetched ${players?.length} WhatsApp group members`);

      // Fetch shield token usage for this game
      const { data: shieldUsage, error: shieldError } = await supabase
        .from('shield_token_usage')
        .select(`
          player_id,
          players!shield_token_usage_player_id_fkey(
            friendly_name,
            protected_streak_value
          )
        `)
        .eq('game_id', game.id);

      if (shieldError) {
        console.error('Error fetching shield usage:', shieldError);
      }
      console.log(`Fetched ${shieldUsage?.length || 0} shield token users`);

      // Fetch players with shield tokens available
      const { data: playersWithShields, error: playersWithShieldsError } = await supabase
        .from('players')
        .select('id, friendly_name')
        .in('whatsapp_group_member', ['Yes', 'Proxy'])
        .gt('shield_tokens_available', 0)
        .order('friendly_name');

      if (playersWithShieldsError) {
        console.error('Error fetching players with shields:', playersWithShieldsError);
      }
      console.log(`Fetched ${playersWithShields?.length || 0} players with shield tokens available`);

      // Query the public_player_token_status view which contains eligibility data
      // This view handles all the complex eligibility logic including:
      // - Recent game participation
      // - Not being selected in recent games
      // - No outstanding payments
      console.log('Querying public_player_token_status view');
      const { data: tokenStatusData, error: tokenStatusError } = await supabase
        .from('public_player_token_status')
        .select('*');

      if (tokenStatusError) {
        console.error('Error fetching token status data:', tokenStatusError);
        toast.error('Failed to get token status data');
      } else {
        console.log(`Successfully fetched ${tokenStatusData?.length} token status records`);
      }

      // Find the players who are eligible for tokens, regardless of whether they have an active token already
      // For the WhatsApp message, we only care about eligibility status, not whether they currently have an active token
      const eligiblePlayers = players
        .filter(player => {
          // Find the corresponding token status for this player
          const playerTokenStatus = tokenStatusData?.find(ts => ts.player_id === player.id);
          
          if (!playerTokenStatus) {
            console.log(`No token status found for player ${player.friendly_name}`);
            return false;
          }

          // For WhatsApp message, we just care if they're eligible according to the view
          const isEligible = playerTokenStatus.is_eligible;
          
          console.log(`Player ${player.friendly_name}: Eligible=${isEligible}`);
          
          return isEligible;
        })
        .map(player => ({
          id: player.id,
          friendly_name: player.friendly_name
        }));

      console.log('Eligible players for tokens:', eligiblePlayers);

      // Get player XP data from Supabase
      const { data: playerXpData, error: xpError } = await supabase
        .from('player_xp')
        .select('player_id, xp')
        .in('player_id', game.game_registrations?.map(reg => reg.player?.id).filter(Boolean) || []);

      if (xpError) {
        console.error('Error fetching player XP:', xpError);
        toast.error('Failed to get player XP data');
        return;
      }

      // Create a map of player IDs to XP
      const playerXpMap = new Map(
        playerXpData?.map(({ player_id, xp }) => [player_id, xp]) || []
      );

      const gameDate = new Date(game.date);
      const endTime = new Date(gameDate);
      endTime.setHours(endTime.getHours() + 1);

      // Format the registration end date
      const regEndDate = formatWhatsAppDate(game.registration_window_end);
      const regEndTime = formatWhatsAppTime(game.registration_window_end);

      // Base message with the new format
      let message = `📅 ${formatWhatsAppDate(game.date)}
⏰ ${formatWhatsAppTime(game.date)} - ${formatWhatsAppTime(endTime.toISOString())}
🎮 WNF #${game.sequence_number || '?'}
📍 ${game.venue?.name}
📍 ${game.venue?.google_maps_url || ''}
🔗 Game Details: https://wnf.app/games
⚽ ${game.max_players} players / ${game.max_players / 2}-a-side`;

      // Add status-specific messages
      switch (game.status) {
        case GAME_STATUSES.UPCOMING:
        case GAME_STATUSES.OPEN:
          message += `\n\n🎮 Registration is OPEN!

Reply to this message with names of any reserves outside of this group that want to play.

React with ONE option only:
👍 Register interest to play
🪙 Use priority token (guaranteed spot this week, likely no spot next week)
🛡️ Use shield token (protect your streak if you can't play)`;

          // Priority token eligible players (comma list)
          if (eligiblePlayers.length > 0) {
            const tokenNames = eligiblePlayers
              .map(p => p.friendly_name)
              .sort((a, b) => a.localeCompare(b))
              .join(', ');
            message += `\n\n🪙 Priority tokens: ${tokenNames}`;
          } else {
            message += '\n\n🪙 No players are eligible for a priority token this week.';
          }

          // Shield token available players (comma list)
          if (playersWithShields && playersWithShields.length > 0) {
            const shieldNames = playersWithShields
              .map(p => p.friendly_name)
              .join(', ');
            message += `\n\n🛡️ Shield tokens: ${shieldNames}`;
          }

          message += `\n\nRegistration closes ${regEndDate} at ${regEndTime}`;
          break;

        case GAME_STATUSES.PLAYERS_ANNOUNCED:
          // Get all selected players (both merit and random)
          const selectedPlayers = game.game_registrations?.filter(reg => reg.status === 'selected');
          const reservePlayers = game.game_registrations?.filter(reg => reg.status === 'reserve');

          // Get token cooldown data - players who used tokens in the previous game
          const { data: tokenCooldownData } = await supabase.rpc(
            'check_previous_game_token_usage',
            { current_game_id: game.id }
          );
          const tokenCooldownPlayerIds = new Set(tokenCooldownData?.map((u: { player_id: string }) => u.player_id) || []);

          // Get additional data for reasoning
          const tokenPlayers = selectedPlayers?.filter(reg => reg.using_token) || [];
          const meritPlayers = selectedPlayers?.filter(reg => reg.selection_method === 'merit') || [];
          const randomPlayers = selectedPlayers?.filter(reg => reg.selection_method === 'random') || [];

          // Get player unpaid games data for penalty indicator
          // Now included in the player data from game_registrations
          const allPlayersWithStatus = [...(selectedPlayers || []), ...(reservePlayers || [])];
          const playersWithUnpaidGames = allPlayersWithStatus.filter(reg => (reg.player?.unpaid_games || 0) > 0);

          // Add selection reasoning summary
          message += '\n';

          if (tokenPlayers.length > 0) {
            message += `\n🪙 ${tokenPlayers.length} Guaranteed token${tokenPlayers.length > 1 ? 's' : ''} used this week`;
          }

          if (meritPlayers.length > 0) {
            message += `\n✅ First ${meritPlayers.length} players chosen by XP`;
          }

          if (randomPlayers.length > 0) {
            message += `\n🎲 Remaining ${randomPlayers.length} players chosen at random`;
          }

          if (playersWithUnpaidGames.length > 0) {
            message += `\n💰 XP penalty due to missing payments`;
          }

          const tokenCooldownCount = [...(selectedPlayers || []), ...(reservePlayers || [])]
            .filter(reg => tokenCooldownPlayerIds.has(reg.player?.id || ''))
            .length;

          if (tokenCooldownCount > 0) {
            message += `\n⏸️ ${tokenCooldownCount} player${tokenCooldownCount > 1 ? 's' : ''} on token cooldown this week`;
          }

          if (shieldUsage && shieldUsage.length > 0) {
            message += `\n🛡️ ${shieldUsage.length} player${shieldUsage.length > 1 ? 's' : ''} using streak protection this week`;
          }

          if (selectedPlayers?.length > 0) {
            message += `\n\n✅ Selected Players (${selectedPlayers.length}):\n`;
            selectedPlayers
              .sort((a, b) => {
                // First priority: Token users at the top
                const aIsToken = a.using_token || false;
                const bIsToken = b.using_token || false;
                if (aIsToken !== bIsToken) return aIsToken ? -1 : 1;
                
                // Second priority: Sort by XP
                return Number(playerXpMap.get(b.player?.id || '') || 0) - Number(playerXpMap.get(a.player?.id || '') || 0);
              })
              .forEach(reg => {
                const xp = playerXpMap.get(reg.player?.id || '') || 0;
                const isToken = reg.using_token;
                const isRandom = reg.selection_method === 'random';
                const playerUnpaid = reg.player?.unpaid_games || 0;
                const isOnCooldown = tokenCooldownPlayerIds.has(reg.player?.id || '');

                let prefix = '';
                if (isToken) prefix = '🪙';
                else if (isRandom) prefix = '🎲';
                if (isOnCooldown) prefix += '⏸️';
                if (playerUnpaid > 0) prefix += '💰';

                message += `\n${prefix}${reg.player?.friendly_name || 'Unknown'} (${xp} XP)`;
              });
          }

          // Add reserve players section
          if (reservePlayers?.length > 0) {
            message += `\n\n🔄 Reserves in XP order (${reservePlayers.length}):\n`;
            reservePlayers
              .sort((a, b) => Number(playerXpMap.get(b.player?.id || '') || 0) - Number(playerXpMap.get(a.player?.id || '') || 0))
              .forEach(reg => {
                const xp = playerXpMap.get(reg.player?.id || '') || 0;
                const playerUnpaid = reg.player?.unpaid_games || 0;
                const isOnCooldown = tokenCooldownPlayerIds.has(reg.player?.id || '');

                let prefix = '';
                if (isOnCooldown) prefix += '⏸️';
                if (playerUnpaid > 0) prefix += '💰';

                message += `\n${prefix}${reg.player?.friendly_name || 'Unknown'} (${xp} XP)`;
              });
          }

          // Add dropped out players section
          const droppedOut = game.game_registrations?.filter(reg => reg.status === 'dropped_out');
          if (droppedOut?.length > 0) {
            message += '\n\n❌ Dropped Out:\n';
            droppedOut
              .sort((a, b) => Number(playerXpMap.get(b.player?.id || '') || 0) - Number(playerXpMap.get(a.player?.id || '') || 0))
              .forEach(reg => {
                const xp = playerXpMap.get(reg.player?.id || '') || 0;
                message += `\n${reg.player?.friendly_name || 'Unknown'} (${xp} XP)`;
              });
          }

          // Add shield protection section
          if (shieldUsage && shieldUsage.length > 0) {
            message += '\n\n🛡️ Protected Players (using streak shields):\n';
            [...shieldUsage]
              .sort((a: any, b: any) => (a.players?.friendly_name || '').localeCompare(b.players?.friendly_name || ''))
              .forEach((usage: any) => {
                const protectedStreak = usage.players?.protected_streak_value || 0;
                message += `\n🛡️ ${usage.players?.friendly_name} (${protectedStreak} game streak protected)`;
              });
          }

          // Add explanation about reserve streak bonus for next week
          const reservePlayersCount = reservePlayers?.length || 0;

          if (reservePlayersCount > 0) {
            message += '\n\n📈 Players not selected this week get boosted chances for random selection next week';
          }

          // Add drop-out message
          message += '\n\nAnyone needs to drop out (inc reserves) please let me know 👍';
          break;

        case GAME_STATUSES.TEAMS_ANNOUNCED:
          message += '\n\n▶️ Starting teams for tonight:\n';
          
          // Get all selected players
          const selectedPlayersTeams = game.game_registrations?.filter(reg => reg.status === 'selected') || [];
          
          // Sort players by team and then by name
          const orangeTeam = selectedPlayersTeams
            .filter(reg => reg.team === 'orange')
            .map(reg => reg.player?.friendly_name || 'Unknown')
            .sort();
            
          const blueTeam = selectedPlayersTeams
            .filter(reg => reg.team === 'blue')
            .map(reg => reg.player?.friendly_name || 'Unknown')
            .sort();
          
          // Add orange team
          message += '\n🟠 Orange';
          orangeTeam.forEach(name => {
            message += `\n${name}`;
          });
          
          // Add blue team
          message += '\n\n🔵 Blue';
          blueTeam.forEach(name => {
            message += `\n${name}`;
          });
          break;

        case GAME_STATUSES.COMPLETED:
          message += '\n\n🏆 Game Complete!\nCheck the app to see the results and your updated stats.';
          break;

        case GAME_STATUSES.CANCELLED:
          message += '\n\n❌ Game Cancelled\nPlease check the app for more information.';
          break;

        default:
          message += `\n\nRegistration closes ${regEndDate} at ${regEndTime}`;
      }

      try {
        await navigator.clipboard.writeText(message);
        toast.success('WhatsApp message copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy message:', err);
        toast.error('Failed to copy message to clipboard');
      }
    } catch (err) {
      console.error('Error sharing on WhatsApp:', err);
      toast.error('Failed to share on WhatsApp');
    }
  };

  const simulateRegistrationClose = async () => {
    setIsSimulating(true);
    
    try {
      const xpSlots = game.max_players - game.random_slots;

      // Get all registered players
      const { data: registeredPlayers, error: fetchError } = await supabaseAdmin
        .from('game_registrations')
        .select(`
          player_id,
          status,
          selection_method,
          created_at,
          using_token
        `)
        .eq('game_id', game.id)
        .eq('status', 'registered');

      if (fetchError) throw fetchError;
      if (!registeredPlayers?.length) {
        toast.error('No registered players found');
        return;
      }

      // Get player IDs
      const playerIds = registeredPlayers.map(reg => reg.player_id);

      // Get previous game token usage
      const { data: previousGameTokenUsers } = await supabaseAdmin.rpc(
        'check_previous_game_token_usage',
        { current_game_id: game.id }
      );

      // Get player details including unpaid games
      const { data: playerDetails } = await supabaseAdmin
        .from('players')
        .select('id, friendly_name, whatsapp_group_member, bench_warmer_streak, unpaid_games, unpaid_games_modifier')
        .in('id', playerIds);

      // Get player stats
      const { data: playerStats } = await supabaseAdmin
        .from('player_stats')
        .select('id, xp, current_streak, caps')
        .in('id', playerIds);

      // Transform and enrich player data
      const players = registeredPlayers.map(reg => {
        const details = playerDetails?.find(p => p.id === reg.player_id);
        const stats = playerStats?.find(p => p.id === reg.player_id);
        const usedTokenLastGame = previousGameTokenUsers?.some((u: { player_id: string }) => u.player_id === reg.player_id) ?? false;
        return {
          id: reg.player_id,
          friendly_name: details?.friendly_name || 'Unknown',
          xp: stats?.xp || 0,
          whatsapp_group_member: details?.whatsapp_group_member || 'No',
          current_streak: stats?.current_streak || 0,
          caps: stats?.caps || 0,
          registration_time: reg.created_at,
          bench_warmer_streak: details?.bench_warmer_streak || 0,
          using_token: reg.using_token || false,
          used_token_last_game: usedTokenLastGame,
          unpaid_games: details?.unpaid_games || 0,
          unpaid_games_modifier: details?.unpaid_games_modifier || 0
        };
      });

      // Separate token users
      const tokenUsers = players.filter(p => p.using_token);
      const nonTokenUsers = players.filter(p => !p.using_token);

      // Sort non-token users by merit criteria (matching database function logic)
      const sortedByMerit = [...nonTokenUsers].sort((a, b) => {
        // Primary: Players with no unpaid games first
        const aHasUnpaid = (a.unpaid_games || 0) > 0 ? 1 : 0;
        const bHasUnpaid = (b.unpaid_games || 0) > 0 ? 1 : 0;
        if (aHasUnpaid !== bHasUnpaid) {
          return aHasUnpaid - bHasUnpaid;
        }
        // Secondary: XP comparison (highest first)
        if (b.xp !== a.xp) return b.xp - a.xp;
        // Tertiary: WhatsApp status
        const aIsWhatsApp = a.whatsapp_group_member === 'Yes' || a.whatsapp_group_member === 'Proxy';
        const bIsWhatsApp = b.whatsapp_group_member === 'Yes' || b.whatsapp_group_member === 'Proxy';
        if (aIsWhatsApp !== bIsWhatsApp) return aIsWhatsApp ? -1 : 1;
        // Additional tiebreakers (not in database function but useful for simulation)
        // Token cooldown check
        if (a.used_token_last_game !== b.used_token_last_game) {
          return a.used_token_last_game ? 1 : -1;
        }
        // Streak
        if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak;
        // Caps
        if (b.caps !== a.caps) return b.caps - a.caps;
        // Registration time
        return (a.registration_time || '').localeCompare(b.registration_time || '');
      });

      // Check which token users would get in by merit
      const allPlayersSorted = [...players].sort((a, b) => {
        if (b.xp !== a.xp) return b.xp - a.xp;
        const aIsWhatsApp = a.whatsapp_group_member === 'Yes' || a.whatsapp_group_member === 'Proxy';
        const bIsWhatsApp = b.whatsapp_group_member === 'Yes' || b.whatsapp_group_member === 'Proxy';
        if (aIsWhatsApp !== bIsWhatsApp) return aIsWhatsApp ? -1 : 1;
        if (b.current_streak !== a.current_streak) return b.current_streak - a.current_streak;
        if (b.caps !== a.caps) return b.caps - a.caps;
        return (a.registration_time || '').localeCompare(b.registration_time || '');
      });

      const tokenUsersSavedByMerit = tokenUsers.filter(tokenPlayer => {
        const meritPosition = allPlayersSorted.findIndex(p => p.id === tokenPlayer.id);
        return meritPosition < xpSlots;
      });

      // Select merit players
      const availableXpSlots = Math.max(0, xpSlots - tokenUsers.length);
      const meritPlayers = sortedByMerit.slice(0, availableXpSlots);

      // Remaining players for random selection
      const remainingPlayers = sortedByMerit.filter(
        p => !meritPlayers.some(mp => mp.id === p.id)
      );

      // Simulate weighted random selection
      const simulateWeightedSelection = (candidates: any[], numSlots: number) => {
        const selected: any[] = [];
        const remaining = [...candidates];
        
        for (let i = 0; i < numSlots && remaining.length > 0; i++) {
          const weights = remaining.map(p => 1 + (p.bench_warmer_streak || 0));
          const totalWeight = weights.reduce((sum, w) => sum + w, 0);
          
          // Simulate selection
          const roll = Math.random() * totalWeight;
          let cumulative = 0;
          let selectedIndex = -1;
          
          for (let j = 0; j < weights.length; j++) {
            cumulative += weights[j];
            if (roll < cumulative) {
              selectedIndex = j;
              break;
            }
          }
          
          if (selectedIndex !== -1) {
            selected.push(remaining[selectedIndex]);
            remaining.splice(selectedIndex, 1);
          }
        }
        
        return selected;
      };

      // Separate by WhatsApp status for random selection, prioritizing players with no unpaid games
      const whatsappEligibleNoPenalty = remainingPlayers.filter(
        p => !p.used_token_last_game && 
            (p.whatsapp_group_member === 'Yes' || p.whatsapp_group_member === 'Proxy') &&
            (p.unpaid_games || 0) === 0
      );
      const whatsappEligibleWithPenalty = remainingPlayers.filter(
        p => !p.used_token_last_game && 
            (p.whatsapp_group_member === 'Yes' || p.whatsapp_group_member === 'Proxy') &&
            (p.unpaid_games || 0) > 0
      );
      const nonWhatsappEligibleNoPenalty = remainingPlayers.filter(
        p => !p.used_token_last_game && 
            (p.whatsapp_group_member === 'No' || p.whatsapp_group_member === null) &&
            (p.unpaid_games || 0) === 0
      );
      const nonWhatsappEligibleWithPenalty = remainingPlayers.filter(
        p => !p.used_token_last_game && 
            (p.whatsapp_group_member === 'No' || p.whatsapp_group_member === null) &&
            (p.unpaid_games || 0) > 0
      );
      const tokenCooldownPlayers = remainingPlayers.filter(
        p => p.used_token_last_game && (p.whatsapp_group_member === 'Yes' || p.whatsapp_group_member === 'Proxy')
      );

      let randomPlayers: any[] = [];
      
      // Priority order for random selection:
      // 1. WhatsApp members with no unpaid games
      // 2. Non-WhatsApp members with no unpaid games  
      // 3. WhatsApp members with unpaid games
      // 4. Non-WhatsApp members with unpaid games
      // 5. Token cooldown players
      
      const selectionGroups = [
        whatsappEligibleNoPenalty,
        nonWhatsappEligibleNoPenalty,
        whatsappEligibleWithPenalty,
        nonWhatsappEligibleWithPenalty,
        tokenCooldownPlayers
      ];
      
      let slotsToFill = game.random_slots;
      
      for (const group of selectionGroups) {
        if (slotsToFill <= 0 || group.length === 0) continue;
        
        const slotsFromThisGroup = Math.min(slotsToFill, group.length);
        const selectedFromGroup = simulateWeightedSelection(group, slotsFromThisGroup);
        randomPlayers = [...randomPlayers, ...selectedFromGroup];
        slotsToFill -= selectedFromGroup.length;
      }

      // Calculate reserves and sort them properly
      const selectedPlayerIds = [
        ...tokenUsers.map(p => p.id),
        ...meritPlayers.map(p => p.id),
        ...randomPlayers.map(p => p.id)
      ];
      const reservePlayers = players
        .filter(p => !selectedPlayerIds.includes(p.id))
        .sort((a, b) => {
          // First check WhatsApp status
          const aIsWhatsApp = a.whatsapp_group_member === 'Yes' || a.whatsapp_group_member === 'Proxy';
          const bIsWhatsApp = b.whatsapp_group_member === 'Yes' || b.whatsapp_group_member === 'Proxy';
          
          if (aIsWhatsApp !== bIsWhatsApp) {
            return aIsWhatsApp ? -1 : 1;
          }

          // Both have same WhatsApp status - check unpaid games (no unpaid games first)
          const aHasUnpaid = (a.unpaid_games || 0) > 0 ? 1 : 0;
          const bHasUnpaid = (b.unpaid_games || 0) > 0 ? 1 : 0;
          if (aHasUnpaid !== bHasUnpaid) {
            return aHasUnpaid - bHasUnpaid;
          }

          // Both have same payment status - compare by XP
          if ((b.xp || 0) !== (a.xp || 0)) {
            return (b.xp || 0) - (a.xp || 0);
          }

          // Same XP - check streak
          if ((b.current_streak || 0) !== (a.current_streak || 0)) {
            return (b.current_streak || 0) - (a.current_streak || 0);
          }

          // Same streak - check caps
          if ((b.caps || 0) !== (a.caps || 0)) {
            return (b.caps || 0) - (a.caps || 0);
          }

          // Same caps - check registration time
          return (a.registration_time || '').localeCompare(b.registration_time || '');
        });

      const result = {
        tokenPlayers: tokenUsers,
        meritPlayers,
        randomPlayers,
        reservePlayers,
        tokenUsersSavedByMerit
      };
      
      setSimulationResult(result);
      setShowModal(true);
      toast.success('Simulation completed successfully');
    } catch (error: any) {
      console.error('Simulation error:', error);
      toast.error(`Simulation failed: ${error.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-200 shadow-xl"
      >
        <div className="card-body">
          <h2 className="card-title">
            {game.venue?.name || 'No venue'} - {formatDate(game.date)}
          </h2>
          
          <div className="mt-2 space-y-2">
            <p>Status: <span className="badge badge-primary">{game.status}</span></p>
            <p>Registration: {formatDate(game.registration_window_start)} - {formatDate(game.registration_window_end)}</p>
            <p>Team Announcement: {formatDate(game.team_announcement_time)}</p>
            <p>Players: {Number(game.registrations_count)} / {game.max_players}</p>
            {game.pitch_cost > 0 && (
              <p>Pitch Cost: £{game.pitch_cost}</p>
            )}
          </div>

          <div className="card-actions justify-end mt-4">
            <button
              className="btn btn-sm btn-success"
              aria-label="Share on WhatsApp"
              onClick={handleWhatsAppShare}
            >
              <FaWhatsapp className="text-lg" />
            </button>
            <button
              className="btn btn-sm btn-info"
              onClick={simulateRegistrationClose}
              disabled={isSimulating || game.status !== 'open'}
              title={game.status !== 'open' ? 'Simulation only available for open games' : 'Simulate registration close'}
            >
              {isSimulating ? 'Simulating...' : 'Simulate'}
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onViewRegistrations(game.id)}
            >
              View Registrations
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => onEditClick(game)}
            >
              Edit
            </button>
            <button
              className="btn btn-sm btn-error"
              onClick={() => onDeleteClick(game.id)}
            >
              Delete
            </button>
          </div>
        </div>
      </motion.div>

      {/* Simulation Results Modal */}
      {showModal && simulationResult && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">Registration Close Simulation Results</h3>
            <p className="text-sm text-gray-600 mb-4">
              Game: {game.venue?.name || 'No venue'} - {formatDate(game.date)}
            </p>
            
            <div className="space-y-4">
              {/* Token Players */}
              <div>
                <h4 className="font-semibold text-primary mb-3">Token Players ({simulationResult.tokenPlayers.length})</h4>
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Token Status</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationResult.tokenPlayers.map(p => {
                        const tokenSaved = simulationResult.tokenUsersSavedByMerit.some(t => t.id === p.id);
                        const reason = tokenSaved 
                          ? 'Selected by merit anyway - token returned'
                          : 'Selected by token - guaranteed slot';
                        
                        return (
                          <tr key={p.id}>
                            <td className="font-medium">{p.friendly_name}</td>
                            <td>
                              <span className={`badge badge-sm ${tokenSaved ? 'badge-success' : 'badge-primary'}`}>
                                {tokenSaved ? 'Token Saved' : 'Token Used'}
                              </span>
                            </td>
                            <td className="text-xs text-info">{reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Merit Players */}
              <div>
                <h4 className="font-semibold text-success mb-3">Merit Selection ({simulationResult.meritPlayers.length})</h4>
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Player</th>
                        <th>XP</th>
                        <th>WhatsApp</th>
                        <th>Streak</th>
                        <th>Unpaid</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationResult.meritPlayers.map((p, idx) => {
                        let reason = `Merit position ${idx + 1}`;
                        if ((p.unpaid_games || 0) > 0) {
                          reason += ` (despite ${p.unpaid_games} unpaid)`;
                        }
                        
                        return (
                          <tr key={p.id}>
                            <td>{idx + 1}</td>
                            <td className="font-medium">{p.friendly_name}</td>
                            <td>{p.xp}</td>
                            <td>{p.whatsapp_group_member}</td>
                            <td>{p.current_streak}</td>
                            <td>
                              {(p.unpaid_games || 0) > 0 ? (
                                <span className="text-error font-medium">{p.unpaid_games}</span>
                              ) : (
                                <span className="text-success">0</span>
                              )}
                            </td>
                            <td className="text-xs text-info">{reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Random Players */}
              <div>
                <h4 className="font-semibold text-info mb-3">Random Selection ({simulationResult.randomPlayers.length})</h4>
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Weight</th>
                        <th>WhatsApp</th>
                        <th>Unpaid</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationResult.randomPlayers.map(p => {
                        const weight = 1 + (p.bench_warmer_streak || 0);
                        const hasUnpaidGames = (p.unpaid_games || 0) > 0;
                        
                        let reason = `Random selection (weight: ${weight})`;
                        
                        if (hasUnpaidGames) {
                          reason += ` - despite ${p.unpaid_games} unpaid game${p.unpaid_games > 1 ? 's' : ''}`;
                        }
                        
                        if (p.bench_warmer_streak > 0) {
                          reason += `. Boosted by ${p.bench_warmer_streak} reserve games`;
                        }
                        
                        return (
                          <tr key={p.id}>
                            <td className="font-medium">{p.friendly_name}</td>
                            <td>{weight}</td>
                            <td>{p.whatsapp_group_member}</td>
                            <td>
                              {hasUnpaidGames ? (
                                <span className="text-error font-medium">{p.unpaid_games}</span>
                              ) : (
                                <span className="text-success">0</span>
                              )}
                            </td>
                            <td className="text-xs text-info">{reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reserve Players */}
              <div>
                <h4 className="font-semibold text-warning mb-3">Reserves ({simulationResult.reservePlayers.length})</h4>
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Player</th>
                        <th>XP</th>
                        <th>WhatsApp</th>
                        <th>Unpaid</th>
                        <th>Cooldown</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationResult.reservePlayers.map((p, idx) => {
                        let reason = `Reserve position ${idx + 1}`;

                        // Determine why they're in reserves
                        const reasons = [];
                        if (p.used_token_last_game) {
                          reasons.push('used token in previous game - deprioritized');
                        }
                        if ((p.unpaid_games || 0) > 0) {
                          reasons.push(`${p.unpaid_games} unpaid game${p.unpaid_games > 1 ? 's' : ''}`);
                        }
                        if (p.xp < 300) {
                          reasons.push('lower XP');
                        }
                        if (p.whatsapp_group_member !== 'Yes' && p.whatsapp_group_member !== 'Proxy') {
                          reasons.push('not WhatsApp member');
                        }

                        if (reasons.length > 0) {
                          reason = reasons.join(', ');
                        }

                        return (
                          <tr key={p.id}>
                            <td>{idx + 1}</td>
                            <td className="font-medium">{p.friendly_name}</td>
                            <td>{p.xp}</td>
                            <td>{p.whatsapp_group_member}</td>
                            <td>
                              {(p.unpaid_games || 0) > 0 ? (
                                <span className="text-error font-medium">{p.unpaid_games}</span>
                              ) : (
                                <span className="text-success">0</span>
                              )}
                            </td>
                            <td className="text-center">
                              {p.used_token_last_game && <MdPauseCircle size={18} className="text-warning inline" />}
                            </td>
                            <td className="text-xs text-warning">{reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selection Reasoning */}
              <div className="mt-6 border-t-2 border-primary pt-4 bg-base-100 rounded-lg p-4">
                <h4 className="font-bold text-lg mb-3 text-primary">📋 Selection Process Reasoning</h4>
                
                <div className="space-y-4 text-sm">
                  {/* Token Selection */}
                  <div>
                    <h5 className="font-semibold mb-2">Token Selection ({simulationResult.tokenPlayers.length} players)</h5>
                    <p className="mb-2">Players using a priority token are guaranteed a slot. Tokens may be returned if the player would have been selected by merit anyway.</p>
                  </div>

                  {/* Merit Selection */}
                  <div>
                    <h5 className="font-semibold mb-2">Merit Selection ({simulationResult.meritPlayers.length} players)</h5>
                    <p className="mb-2">After token slots were allocated, remaining slots were filled using the following criteria in order:</p>
                    <ol className="list-decimal pl-4 mb-2">
                      <li><strong>Payment status:</strong> Players with unpaid games are moved to the bottom to disincentivise missing payments</li>
                      <li><strong>Token cooldown (<MdPauseCircle size={14} className="text-warning inline" />):</strong> Players who used a token in the previous game are deprioritized (moved to bottom of list)</li>
                      <li><strong>XP:</strong> Highest XP players selected first</li>
                      <li><strong>WhatsApp membership:</strong> Members win tiebreakers</li>
                      <li><strong>Current streak:</strong> Higher streak wins</li>
                      <li><strong>Caps:</strong> More caps wins</li>
                      <li><strong>Registration time:</strong> Earlier registration wins</li>
                    </ol>
                  </div>

                  {/* Random Selection */}
                  <div>
                    <h5 className="font-semibold mb-2">Random Selection ({simulationResult.randomPlayers.length} players)</h5>
                    <p className="mb-2">After token and merit slots were filled, {game.random_slots} slots were reserved for weighted random selection with the following priority order:</p>
                    <ol className="list-decimal pl-4 mb-2">
                      <li><strong>WhatsApp members with no unpaid games</strong> (highest priority)</li>
                      <li><strong>Non-WhatsApp members with no unpaid games</strong></li>
                      <li><strong>WhatsApp members with unpaid games</strong></li>
                      <li><strong>Non-WhatsApp members with unpaid games</strong> (lowest priority)</li>
                    </ol>
                    <p className="mb-2">Within each group, selection is weighted by bench warmer streak:</p>
                    <ul className="list-disc pl-4 mb-2">
                      <li>Base weight: 1 point + 1 point per consecutive reserve game</li>
                      <li>Higher bench warmer streaks = better selection chances</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-action mt-6 border-t pt-4">
              <div className="flex justify-between items-center w-full">
                <span className="text-sm text-gray-500">Scroll up to see selection reasoning ↑</span>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setShowModal(false)
                    setSimulationResult(null)
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
