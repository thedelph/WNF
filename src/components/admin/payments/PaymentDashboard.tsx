import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase, supabaseAdmin } from '../../../utils/supabase';
import PaymentSummary from './PaymentSummary';
import GamePaymentList from './GamePaymentList';
import { Game } from '../../../types/game';
import toast from 'react-hot-toast'; // Assuming you have react-hot-toast installed
import { useAdmin } from '../../../hooks/useAdmin';
import { PERMISSIONS } from '../../../types/permissions';

const PaymentDashboard: React.FC = () => {
  const { hasPermission, loading: adminLoading } = useAdmin();
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
        .order('date', { ascending: false })
        .lte('date', new Date().toISOString()); // Only fetch past games

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
        .in('game_id', gamesData?.map(game => game.id) || [])
        .eq('status', 'selected'); // Only get selected players, we'll filter for payment status in JS

      if (regsError) throw regsError;

      // Calculate the total amount owed for each registration
      const gamesWithRegistrations = gamesData?.map(game => {
        const gameRegistrations = registrationsData?.filter(reg => reg.game_id === game.id) || [];
        const selectedNonReservePlayers = gameRegistrations.filter(
          reg => reg.status === 'selected' 
        );
        const costPerPerson = selectedNonReservePlayers.length ? 
          game.pitch_cost / selectedNonReservePlayers.length : 
          game.pitch_cost;

        return {
          ...game,
          cost_per_person: costPerPerson,
          game_registrations: gameRegistrations.map(reg => ({
            ...reg,
            // Only require payment for past games where player was selected 
            payment_required: new Date(game.date) < new Date() && reg.status === 'selected',
            amount_owed: new Date(game.date) < new Date() && reg.status === 'selected' && !reg.paid ? costPerPerson : 0
          }))
        };
      }) || [];

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
      const now = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No admin user found');

      // Get the admin player record
      const { data: adminPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!adminPlayer) throw new Error('Admin player record not found');

      // Only update selected players
      const { error } = await supabaseAdmin
        .from('game_registrations')
        .update({ 
          paid: true,
          payment_status: 'admin_verified',
          payment_received_date: now,
          payment_verified_at: now,
          payment_verified_by: adminPlayer.id,
          payment_recipient_id: adminPlayer.id
        })
        .in('game_id', games
          .filter(game => new Date(game.date) <= date)
          .map(game => game.id)
        )
        .eq('status', 'selected');

      if (error) throw error;
      toast.success('Successfully marked all selected players as paid up to selected date');
      fetchGames();
    } catch (error) {
      console.error('Error updating payments:', error);
      toast.error('Failed to update payments');
    }
  };

  // Check for permission
  if (adminLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center mt-8">Loading...</div>
      </div>
    );
  }

  if (!hasPermission(PERMISSIONS.MANAGE_PAYMENTS)) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center mt-8">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p>You do not have permission to access Payment Management.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-2 sm:px-4 py-4"
    >
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Payment Management</h1>
      
      {/* Responsive control panel */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="form-control">
          <label className="label cursor-pointer justify-start">
            <span className="label-text mr-2">Show Archived</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
          </label>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <input
            type="date"
            className="input input-bordered w-full sm:w-auto"
            onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
          />
          <button
            className="btn btn-primary w-full sm:w-auto text-sm sm:text-base whitespace-normal sm:whitespace-nowrap height-auto min-h-8 sm:h-12"
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