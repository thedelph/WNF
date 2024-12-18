import { supabase, supabaseAdmin } from '../../utils/supabase';

// Types
interface Notification {
  id: string;
  player_id: string;
  type: string;
  message: string;
  action_url: string;
  created_at: string;
  read_at: string | null;
  metadata?: {
    game_id?: string;
    slot_offer_id?: string;
  };
}

/**
 * Dismisses all notifications for a given player or all notifications if admin
 * @param playerId - The ID of the player whose notifications to dismiss
 * @param isAdmin - Whether the user is an admin
 * @returns Promise<void>
 */
export const dismissAllNotifications = async (playerId: string, isAdmin: boolean) => {
  try {
    let query = supabase
      .from('notifications')
      .delete();

    // Only filter by player_id for non-admins
    if (!isAdmin) {
      query = query.eq('player_id', playerId);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error dismissing all notifications:', error);
    throw error;
  }
};

/**
 * Marks all notifications as read for a given player or all notifications if admin
 * @param playerId - The ID of the player whose notifications to mark as read
 * @param isAdmin - Whether the user is an admin
 * @returns Promise<void>
 */
export const markAllNotificationsAsRead = async (playerId: string, isAdmin: boolean) => {
  try {
    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() });

    // Only filter by player_id for non-admins
    if (!isAdmin) {
      query = query.eq('player_id', playerId);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Dismisses all slot offers for an admin
 * @returns Promise<void>
 */
export const dismissAllSlotOffers = async () => {
  try {
    // Update all pending slot offers to voided
    const { error: slotOfferError } = await supabaseAdmin
      .from('slot_offers')
      .update({ 
        status: 'voided',
        responded_at: new Date().toISOString()
      })
      .eq('status', 'pending');

    if (slotOfferError) {
      throw slotOfferError;
    }

    // Create notifications for players whose offers were voided
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        type: 'system_message',
        message: 'Your slot offer has been voided by an admin.',
        metadata: {
          action: 'slot_offer_voided'
        }
      });

    if (notificationError) {
      throw notificationError;
    }
  } catch (error) {
    console.error('Error dismissing all slot offers:', error);
    throw error;
  }
};
