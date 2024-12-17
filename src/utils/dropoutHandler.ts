import { supabase, supabaseAdmin } from './supabase';
import { ReservePlayer } from '../types/playerSelection';
import { toast } from 'react-hot-toast';

// Calculate how many players should receive offers based on time until game day
const calculateEligiblePlayers = (now: Date, gameDayStart: Date, reservePlayers: ReservePlayer[]) => {
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
  
  console.log(`Hours until game day: ${hoursUntilGameDay}, Percentage of time elapsed: ${(percentageOfTime * 100).toFixed(1)}%, Players to notify: ${numPlayers}`);
  
  return numPlayers;
};

export const handlePlayerSelfDropout = async (playerId: string, gameId: string) => {
  try {
    console.log(`Starting dropout process for player: ${playerId} in game: ${gameId}`);
    
    // Check player's current status
    const { data: playerRegistration, error: statusError } = await supabase
      .from('game_registrations')
      .select('status')
      .eq('player_id', playerId)
      .eq('game_id', gameId)
      .maybeSingle();

    if (statusError) {
      console.error('Error checking player status:', statusError);
      toast.error('Failed to check player status');
      throw statusError;
    }

    // If no registration found or already dropped out, handle appropriately
    if (!playerRegistration) {
      const { error: insertError } = await supabase
        .from('game_registrations')
        .insert([{
          player_id: playerId,
          game_id: gameId,
          status: 'dropped_out'
        }]);

      if (insertError) {
        console.error('Error inserting player status:', insertError);
        toast.error('Failed to update player status');
        throw insertError;
      }
      toast.success('You have been removed from the game.');
      return { success: true };
    }

    if (playerRegistration.status === 'dropped_out') {
      toast.error('You have already dropped out of this game.');
      return { success: false };
    }

    // Store the original status to determine if this was a selected player or reserve
    const wasSelected = playerRegistration.status === 'selected';

    // Update registration to dropped_out
    const { error: updateError } = await supabase
      .from('game_registrations')
      .update({ status: 'dropped_out' })
      .eq('player_id', playerId)
      .eq('game_id', gameId);

    if (updateError) {
      console.error('Error updating player status:', updateError);
      toast.error('Failed to update player status');
      throw updateError;
    }

    console.log('Successfully updated player status to dropped_out');

    // Only proceed with slot offers if the player was selected
    if (wasSelected) {
      // Get game details
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) {
        console.error('Error fetching game:', gameError);
        throw gameError;
      }

      console.log('Successfully fetched game details:', game);

      // Get reserve players
      const { data: reservePlayers, error: reserveError } = await supabase
        .from('game_registrations')
        .select(`
          player_id,
          status,
          players!game_registrations_player_id_fkey (
            id,
            friendly_name,
            win_rate,
            caps
          )
        `)
        .eq('game_id', gameId)
        .eq('status', 'reserve')
        .order('created_at', { ascending: true });

      if (reserveError) {
        console.error('Error fetching reserve players:', reserveError);
        throw reserveError;
      }

      if (reservePlayers && reservePlayers.length > 0) {
        console.log('Found reserve players:', reservePlayers);

        const now = new Date();
        const gameDate = new Date(game.date);
        
        // Set to midnight of game day in local timezone
        const gameDayStart = new Date(gameDate);
        gameDayStart.setHours(0, 0, 0, 0);
        
        // Log times for debugging
        console.log('Time calculations:', {
          now: now.toISOString(),
          gameDate: gameDate.toISOString(),
          gameDayStart: gameDayStart.toISOString(),
          hoursUntilGameDay: (gameDayStart.getTime() - now.getTime()) / (1000 * 60 * 60)
        });

        // Call the database function to create slot offers
        const { error: slotOfferError } = await supabaseAdmin
          .rpc('create_slot_offers_for_game', {
            p_game_id: gameId,
            p_admin_id: playerId
          });

        if (slotOfferError) {
          console.error('Error creating slot offers:', slotOfferError);
          // Continue execution even if slot offers fail
        } else {
          console.log('Successfully created slot offers');
        }

        const numPlayersToNotify = calculateEligiblePlayers(now, gameDayStart, reservePlayers);
        const eligiblePlayers = reservePlayers.slice(0, numPlayersToNotify);

        // Create slot offer notifications for eligible reserve players
        const notifications = eligiblePlayers.map(reserve => ({
          type: 'slot_offer',
          player_id: reserve.player_id,
          message: `A spot has opened up in the game on ${new Date(game.date).toLocaleDateString()}. Would you like to join?`,
          metadata: {
            game_id: gameId,
            dropped_out_player_id: playerId,
            action: 'slot_offer'
          }
        }));

        console.log('Attempting to create notifications:', notifications);

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('Error creating notifications:', notificationError);
          // Continue execution even if notifications fail
        } else {
          console.log('Successfully created notifications');
        }

        toast.success('You have dropped out of the game. Reserve players will be notified of the open spot.');
      } else {
        toast.success('You have dropped out of the game. There are no reserve players to notify.');
      }
    } else {
      // Player was a reserve, just show a simple success message
      toast.success('You have been removed from the reserve list.');
    }

    console.log('Dropout process completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in handlePlayerSelfDropout:', error);
    toast.error('Failed to drop out. Please try again later.');
    throw error;
  }
};

export const handlePlayerDropoutAndOffers = async (gameId: string, playerId: string, now: Date) => {
  try {
    console.log('Starting dropout and offer process for player:', playerId, 'in game:', gameId);
    
    // First verify admin permissions
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_permissions')
      .select(`
        id,
        permission,
        admin_role:admin_roles!admin_permissions_admin_role_id_fkey (
          player_id
        )
      `)
      .eq('permission', 'manage_games')
      .eq('admin_role.player_id', playerId)
      .single();

    if (adminError) {
      console.error('Error checking admin permissions:', adminError);
      throw adminError;
    }

    if (!adminCheck) {
      console.error('User does not have manage_games permission');
      throw new Error('Insufficient permissions');
    }

    console.log('Admin check passed:', adminCheck);

    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (!game) throw new Error('Game not found');

    // Update the dropped out player's status first
    const { data: playerStatus, error: statusError } = await supabase
      .from('game_registrations')
      .select('status')
      .eq('player_id', playerId)
      .eq('game_id', gameId)
      .maybeSingle();

    if (statusError) {
      console.error('Error checking player status:', statusError);
      throw statusError;
    }

    // If no registration found, create a new one with dropped_out status
    if (!playerStatus) {
      const { error: insertError } = await supabase
        .from('game_registrations')
        .insert([
          {
            player_id: playerId,
            game_id: gameId,
            status: 'dropped_out'
          }
        ]);

      if (insertError) {
        console.error('Error inserting player status:', insertError);
        throw insertError;
      }
    } else if (playerStatus.status === 'dropped_out') {
      console.log('Player has already dropped out of this game.');
      return;
    } else {
      // Update existing registration to dropped_out
      const { error: updateError } = await supabase
        .from('game_registrations')
        .update({ status: 'dropped_out' })
        .eq('player_id', playerId)
        .eq('game_id', gameId);

      if (updateError) {
        console.error('Error updating player status:', updateError);
        throw updateError;
      }
    }

    console.log('Successfully updated player status to dropped_out');

    // Get reserve players ordered by XP
    const { data: reservePlayers, error: reserveError } = await supabase
      .from('game_registrations')
      .select(`
        player_id,
        status,
        created_at,
        players!game_registrations_player_id_fkey (
          id,
          friendly_name,
          caps,
          active_bonuses,
          active_penalties,
          current_streak
        )
      `)
      .eq('game_id', gameId)
      .eq('status', 'reserve')
      .order('created_at', { ascending: true });

    if (reserveError) {
      console.error('Error fetching reserve players:', reserveError);
      throw reserveError;
    }

    console.log('Found reserve players:', reservePlayers);

    // If no reserve players, we're done
    if (!reservePlayers?.length) {
      console.log('No reserve players available. Full query results:', reservePlayers);
      return;
    }

    console.log('Found reserve players:', reservePlayers.map(r => ({
      name: r.players.friendly_name,
      status: r.status,
      created_at: r.created_at
    })));
    
    console.log('Found reserve players:', reservePlayers.map(r => r.players.friendly_name));

    // Calculate time slots for each reserve player
    const gameDate = new Date(game.date);
    const gameDayStart = new Date(gameDate);
    gameDayStart.setHours(0, 0, 0, 0);

    // Get eligible players based on time
    const numEligiblePlayers = calculateEligiblePlayers(now, gameDayStart, reservePlayers);
    console.log(`Number of eligible players based on time: ${numEligiblePlayers}`);
    
    // Only proceed if we have players to offer to
    if (numEligiblePlayers <= 0) {
      console.log('No players to offer slots to at this time');
      return;
    }

    // Call the database function to create slot offers
    const { error: slotOfferError } = await supabaseAdmin
      .rpc('create_slot_offers_for_game', {
        p_game_id: gameId,
        p_admin_id: playerId
      });

    if (slotOfferError) {
      console.error('Error creating slot offers:', slotOfferError);
      return;
    }

    console.log('Successfully created slot offers');

    // Offers expire at game kickoff time
    const expiresAt = gameDate;

    // Get player IDs for all reserve players at once
    const { data: reservePlayerData, error: reservePlayerError } = await supabaseAdmin
      .from('players')
      .select('id, friendly_name')
      .in('friendly_name', reservePlayers.map(p => p.players.friendly_name));

    if (reservePlayerError) {
      console.error('Error getting reserve player IDs:', reservePlayerError);
      return;
    }

    console.log('Found reserve player IDs:', reservePlayerData);

    // Create a map of friendly names to player IDs
    const playerIdMap = new Map(reservePlayerData?.map(p => [p.friendly_name, p.id]) || []);

    // Create slot offers and notifications for accessible players
    for (let i = 0; i < Math.min(numEligiblePlayers, reservePlayers.length); i++) {
      const player = reservePlayers[i];
      const playerId = playerIdMap.get(player.players.friendly_name);
      
      if (!playerId) {
        console.error(`Could not find player ID for ${player.players.friendly_name}`);
        continue;
      }

      console.log(`Creating offer for reserve player ${i + 1}/${numEligiblePlayers}:`, player.players.friendly_name);
      
      // Create slot offer
      const { error: offerError } = await supabaseAdmin
        .from('slot_offers')
        .insert({
          game_id: gameId,
          player_id: playerId,
          offered_at: now.toISOString(),
          expires_at: expiresAt.toISOString()
        });

      if (offerError) {
        console.error(`Error creating slot offer for ${player.players.friendly_name}:`, offerError);
        continue;
      }

      console.log(`Creating notification for ${player.players.friendly_name}...`);
      
      // Create notification for the player
      const { data: notification, error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          player_id: playerId,
          type: 'slot_offer',
          message: `A spot has opened up in the game on ${new Date(game.date).toLocaleDateString()}. Would you like to join?`,
          metadata: {
            game_id: gameId,
            action: 'slot_offer'
          }
        })
        .select();

      if (notificationError) {
        console.error(`Error creating notification for ${player.players.friendly_name}:`, notificationError);
        continue;
      }

      console.log(`Successfully created notification for ${player.players.friendly_name}:`, notification);
    }

    console.log('Creating admin notification about dropout...');
    
    // Create notification for admins
    const { data: adminNotification, error: adminNotificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        player_id: playerId,  // Send to the admin who initiated the dropout
        type: 'system_message',
        message: `You have dropped out of the game. ${numEligiblePlayers} reserve players have been offered your slot.`,
        metadata: {
          game_id: gameId,
          action: 'dropout_confirmation',
          players_notified: numEligiblePlayers
        }
      })
      .select();

    if (adminNotificationError) {
      console.error('Error creating admin notification:', adminNotificationError);
    } else {
      console.log('Successfully created admin notification:', adminNotification);
    }

    // Show success message
    toast.success('You have successfully dropped out of the game. Reserve players will be notified.');

    console.log('Dropout and offer process completed successfully');

  } catch (error) {
    console.error('Error in handlePlayerDropoutAndOffers:', error);
    toast.error('Failed to drop out. Please try again later.');
    throw error;
  }
};
