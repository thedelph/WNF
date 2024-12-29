import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../utils/supabase';
import PaymentSummary from './PaymentSummary';
import GamePaymentList from './GamePaymentList';
import { Game } from '../../../types/game';
import toast from 'react-hot-toast'; // Assuming you have react-hot-toast installed

const PaymentDashboard: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchGames();
  }, [showArchived]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      
      // First fetch games with venue info
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          venue:venues (*)
        `)
        .order('date', { ascending: false });

      if (gamesError) throw gamesError;

      // Then fetch all game registrations with player info
      const { data: registrationsData, error: regsError } = await supabase
        .from('game_registrations')
        .select(`
          *,
          player:players!game_registrations_player_id_fkey (
            id,
            friendly_name
          ),
          paid_by:players!game_registrations_paid_by_player_id_fkey (
            id,
            friendly_name
          ),
          payment_recipient:players!game_registrations_payment_recipient_id_fkey (
            id,
            friendly_name
          ),
          payment_verifier:players!game_registrations_payment_verified_by_fkey (
            id,
            friendly_name
          )
        `)
        .in('game_id', gamesData?.map(game => game.id) || []);

      if (regsError) throw regsError;

      // Combine the data
      const gamesWithRegistrations = gamesData?.map(game => ({
        ...game,
        game_registrations: registrationsData?.filter(reg => reg.game_id === game.id) || []
      })) || [];

      setGames(gamesWithRegistrations);
    } catch (error: any) {
      console.error('Error fetching games:', error);
      toast.error(error.message || 'Failed to fetch games data');
    } finally {
      setLoading(false);
    }
  };

  const markAllPaidUpToDate = async (date: Date) => {
    try {
      const { error } = await supabase
        .from('game_registrations')
        .update({ 
          paid: true,
          payment_received_date: new Date().toISOString()
        })
        .in('game_id', games
          .filter(game => new Date(game.date) <= date)
          .map(game => game.id)
        );

      if (error) throw error;
      toast.success('Successfully marked all games as paid up to selected date');
      fetchGames();
    } catch (error) {
      console.error('Error updating payments:', error);
      toast.error('Failed to update payments');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto p-4"
    >
      <h1 className="text-3xl font-bold mb-6">Payment Management</h1>
      
      <div className="flex justify-between items-center mb-6">
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text mr-2">Show Archived</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
          </label>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            type="date"
            className="input input-bordered"
            onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
          />
          <button
            className="btn btn-primary"
            onClick={() => selectedDate && markAllPaidUpToDate(selectedDate)}
            disabled={!selectedDate}
          >
            Mark All Paid Up To Date
          </button>
        </div>
      </div>
      
      <PaymentSummary games={games} />
      <GamePaymentList 
        games={games}
        loading={loading}
        showArchived={showArchived}
        onUpdate={fetchGames}
      />
    </motion.div>
  );
};

export default PaymentDashboard;