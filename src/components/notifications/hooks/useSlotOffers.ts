import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../../../utils/supabase';
import { SlotOffer } from '../types';
import toast from '../../../utils/toast';
import { useUser } from '../../../hooks/useUser';

export const useSlotOffers = () => {
  const { player } = useUser();
  const [activeSlotOffers, setActiveSlotOffers] = useState<SlotOffer[]>([]);

  // Fetch active slot offers
  const fetchActiveSlotOffers = async () => {
    if (!player?.isAdmin) return;

    try {
      console.log('Fetching active slot offers...');
      const { data: offers, error } = await supabaseAdmin
        .from('slot_offers')
        .select(`
          id,
          game_id,
          player_id,
          status,
          offered_at,
          responded_at,
          player:players!slot_offers_player_id_fkey (
            id,
            friendly_name
          ),
          game:games!slot_offers_game_id_fkey (
            id,
            date,
            venue:venues (
              name
            )
          )
        `)
        .eq('status', 'pending')
        .order('offered_at', { ascending: false });

      if (error) {
        console.error('Error fetching slot offers:', error);
        throw error;
      }

      setActiveSlotOffers(offers || []);
    } catch (error) {
      console.error('Error in fetchActiveSlotOffers:', error);
    }
  };

  // Handler for slot offer actions (accept/decline)
  const handleSlotOffer = async (notificationId: string, gameId: string, accept: boolean) => {
    try {
      // Get the notification first to get the slot offer ID
      const { data: notification, error: notificationError } = await supabaseAdmin
        .from('notifications')
        .select('metadata')
        .eq('id', notificationId)
        .maybeSingle();

      if (notificationError) throw notificationError;
      if (!notification) {
        throw new Error('Notification not found');
      }

      const metadata = typeof notification.metadata === 'string'
        ? JSON.parse(notification.metadata)
        : notification.metadata;

      if (!metadata?.slot_offer_id) {
        throw new Error('No slot offer ID found in notification');
      }

      // Check if this player is the one who dropped out
      if (metadata.dropped_out_player_id === player?.id) {
        toast.error('You cannot accept a slot offer for a game you dropped out from');
        return;
      }

      // Get the slot offer with status 'pending'
      const { data: slotOffer, error: fetchError } = await supabaseAdmin
        .from('slot_offers')
        .select('*')
        .eq('id', metadata.slot_offer_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!slotOffer) {
        throw new Error('Slot offer not found or already processed');
      }

      // Update slot offer status
      const { error: updateError } = await supabaseAdmin
        .from('slot_offers')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', metadata.slot_offer_id);

      if (updateError) throw updateError;

      // If accepted, update game registration
      if (accept) {
        // First check if registration exists
        const { data: existingReg, error: checkError } = await supabaseAdmin
          .from('game_registrations')
          .select('id, status')
          .eq('game_id', gameId)
          .eq('player_id', player?.id)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingReg) {
          // Update existing registration
          const { error: updateRegError } = await supabaseAdmin
            .from('game_registrations')
            .update({ 
              status: 'selected'
            })
            .eq('id', existingReg.id);

          if (updateRegError) throw updateRegError;
        } else {
          // Create new registration
          const { error: createRegError } = await supabaseAdmin
            .from('game_registrations')
            .insert({
              game_id: gameId,
              player_id: player?.id,
              status: 'selected',
              created_at: new Date().toISOString()
            });

          if (createRegError) throw createRegError;
        }
      }

      // Dismiss the notification
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      await fetchActiveSlotOffers();
      toast.success(accept ? 'Slot offer accepted!' : 'Slot offer declined');
    } catch (error) {
      console.error('Error handling slot offer:', error);
      toast.error('Failed to process slot offer');
    }
  };

  // Handler for dismissing slot offers (admin only)
  const handleDismissSlotOffer = async (offerId: string) => {
    try {
      const { error } = await supabaseAdmin
        .from('slot_offers')
        .update({
          status: 'voided',
          responded_at: new Date().toISOString()
        })
        .eq('id', offerId);

      if (error) throw error;
      await fetchActiveSlotOffers();
      toast.success('Slot offer dismissed');
    } catch (error) {
      console.error('Error dismissing slot offer:', error);
      toast.error('Failed to dismiss slot offer');
    }
  };

  // Set up real-time subscription for slot offers
  useEffect(() => {
    if (!player?.isAdmin) return;

    const slotOfferChannel = supabaseAdmin
      .channel('slot_offers-' + player.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slot_offers'
        },
        () => {
          fetchActiveSlotOffers();
        }
      )
      .subscribe();

    return () => {
      slotOfferChannel.unsubscribe();
    };
  }, [player?.id]);

  // Initial fetch
  useEffect(() => {
    if (player?.isAdmin) {
      fetchActiveSlotOffers();
    }
  }, [player?.id]);

  return {
    activeSlotOffers,
    handleSlotOffer,
    handleDismissSlotOffer,
    fetchActiveSlotOffers
  };
};
