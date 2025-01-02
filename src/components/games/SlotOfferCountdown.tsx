import React from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import { calculateRarity } from '../../utils/rarityCalculations';
import PlayerCard from '../PlayerCard';
import CountdownTimer from '../CountdownTimer';
import { ExtendedPlayerData } from '../../types/playerSelection';
import { toast } from 'react-hot-toast';

interface SlotOfferCountdownProps {
  player: ExtendedPlayerData;
  gameId: string;
  onSlotOfferExpired: () => void;
  onSlotOfferAccepted: () => void;
  onSlotOfferDeclined: () => void;
}

export const SlotOfferCountdown: React.FC<SlotOfferCountdownProps> = ({
  player,
  gameId,
  onSlotOfferExpired,
  onSlotOfferAccepted,
  onSlotOfferDeclined,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [playerStats, setPlayerStats] = React.useState<{ xp: number }>({ xp: 0 });

  React.useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: statsData, error: statsError } = await supabase
          .from('player_stats')
          .select('xp')
          .eq('id', player.id)
          .single();

        if (statsError) throw statsError;

        setPlayerStats({ xp: statsData.xp || 0 });
      } catch (error) {
        console.error('Error fetching player stats:', error);
        setError(error instanceof Error ? error.message : 'An error occurred while fetching player stats');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();
  }, [player.id]);

  const handleAcceptSlot = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('game_registrations')
        .update({ slot_offer_status: 'accepted' })
        .eq('game_id', gameId)
        .eq('player_id', player.id);

      if (updateError) throw updateError;

      toast.success('Slot offer accepted!');
      onSlotOfferAccepted();
    } catch (error) {
      console.error('Error accepting slot offer:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while accepting the slot offer');
      toast.error('Failed to accept slot offer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineSlot = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('game_registrations')
        .update({ slot_offer_status: 'declined' })
        .eq('game_id', gameId)
        .eq('player_id', player.id);

      if (updateError) throw updateError;

      toast.success('Slot offer declined');
      onSlotOfferDeclined();
    } catch (error) {
      console.error('Error declining slot offer:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while declining the slot offer');
      toast.error('Failed to decline slot offer');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-error p-4">
        <p>{error}</p>
      </div>
    );
  }

  // Calculate rarity based on XP
  const { data: allXPData } = supabase
    .from('player_stats')
    .select('xp');

  const allXP = allXPData?.map(p => p.xp || 0) || [];
  const rarity = calculateRarity(playerStats.xp, allXP);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-base-200 rounded-lg p-6"
      >
        <h3 className="text-xl font-bold mb-4">You've Been Offered a Slot!</h3>
        
        <div className="grid grid-cols-1 gap-6">
          <div>
            <PlayerCard
              {...player}
              xp={playerStats.xp}
              rarity={rarity}
            />
          </div>

          <div className="bg-base-100 rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-2">Time Remaining to Accept</h4>
            <CountdownTimer
              targetDate={new Date(player.slot_offer_expires_at || '')}
              onExpire={onSlotOfferExpired}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDeclineSlot}
              disabled={loading}
              className="btn btn-error"
            >
              Decline Slot
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAcceptSlot}
              disabled={loading}
              className="btn btn-success"
            >
              Accept Slot
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
