import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../utils/supabase';
import { AdminSlotOffers } from '../../components/notifications/AdminSlotOffers';
import { SlotOffer } from '../../components/notifications/types';
import { PageHeader } from '../../components/common/PageHeader';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Admin page for managing slot offers
 * Provides a dedicated interface for admins to oversee and manage all slot offers
 */
export const SlotOffersPage = () => {
  const [slotOffers, setSlotOffers] = useState<SlotOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchSlotOffers = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('slot_offers')
        .select(`
          *,
          player:players!slot_offers_player_id_fkey (
            id,
            friendly_name
          ),
          game:games!slot_offers_game_id_fkey (
            id,
            date,
            venue:venues!games_venue_id_fkey (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSlotOffers(data || []);
    } catch (error) {
      console.error('Error fetching slot offers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlotOffers();

    // Set up real-time subscription
    const slotOffersChannel = supabaseAdmin
      .channel('slot-offers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slot_offers',
        },
        (payload) => {
          console.log('Slot offer change detected:', payload);
          fetchSlotOffers();
        }
      )
      .subscribe();

    return () => {
      supabaseAdmin.removeChannel(slotOffersChannel);
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Slot Offers Management"
        description="Manage and oversee all slot offers for games"
        leftElement={
          <button
            onClick={() => navigate('/admin')}
            className="btn btn-ghost btn-sm gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        }
      />

      <div className="mt-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <AdminSlotOffers
            slotOffers={slotOffers}
            onUpdate={fetchSlotOffers}
          />
        )}
      </div>
    </div>
  );
};
