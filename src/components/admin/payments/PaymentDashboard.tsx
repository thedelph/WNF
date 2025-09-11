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
      // IMPORTANT: Limited to 30 games to prevent Supabase query limits
      // When fetching registrations for 60+ games, the IN query would hit
      // Supabase's 1000 record limit, causing some games to show 0 players
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          venue:venues (*)
        `)
        .order('date', { ascending: false })
        .lte('date', new Date().toISOString()) // Only fetch past games
        .limit(30); // Prevents query limit issues with large datasets

      if (gamesError) throw gamesError;

      // Then fetch all game registrations for these games
      const gameIds = gamesData?.map(game => game.id) || [];
      console.log('Fetching registrations for games:', gameIds.length, 'games');
      
      // BATCH FETCHING: Split into groups of 10 games to avoid Supabase query limits
      // Previously, querying 60+ games in one IN statement would return max 1000 records,
      // causing games like #63 to show 0 players when their registrations weren't in the first 1000
      let allRegistrations = [];
      const batchSize = 10; // Optimal batch size to balance performance and query limits
      
      for (let i = 0; i < gameIds.length; i += batchSize) {
        const batch = gameIds.slice(i, i + batchSize);
        const { data: batchData, error: batchError } = await supabase
          .from('game_registrations')
          .select('*')
          .in('game_id', batch);
          
        if (batchError) {
          console.error('Error fetching registration batch:', batchError);
          throw batchError;
        }
        
        allRegistrations = [...allRegistrations, ...(batchData || [])];
      }
      
      const registrationsData = allRegistrations;
      
      console.log('Raw registrations fetched:', registrationsData?.length);
      
      // Check for game 63 specifically
      const game63Id = gamesData?.find(g => g.sequence_number === 63)?.id;
      if (game63Id) {
        const game63Regs = registrationsData?.filter(r => r.game_id === game63Id);
        console.log(`Game 63 (ID: ${game63Id}) has ${game63Regs?.length} registrations in raw data`);
      }

      // SEPARATE PLAYER FETCHING: Fetch player details separately to avoid join complexity
      // game_registrations has multiple foreign keys to players table:
      // - player_id, paid_by_player_id, payment_recipient_id, payment_verified_by
      // This causes Supabase to error with "more than one relationship was found"
      // Solution: Fetch players separately and join in JavaScript
      const playerIds = [...new Set(registrationsData?.map(r => r.player_id).filter(Boolean) || [])];
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, friendly_name')
        .in('id', playerIds);

      if (playersError) {
        console.error('Error fetching players:', playersError);
        throw playersError;
      }

      // Create a map for O(1) player lookups
      const playerMap = new Map(playersData?.map(p => [p.id, p]) || []);

      // Combine registrations with player data in JavaScript
      const registrationsWithPlayers = registrationsData?.map(reg => ({
        ...reg,
        player: playerMap.get(reg.player_id) || null
      })) || [];

      console.log('Fetched registrations:', registrationsWithPlayers?.length, 'registrations');
      console.log('Sample registration:', registrationsWithPlayers?.[0]);

      // Calculate the total amount owed for each registration
      const gamesWithRegistrations = gamesData?.map(game => {
        // Get all registrations for this game
        const gameRegistrations = registrationsWithPlayers?.filter(reg => reg.game_id === game.id) || [];
        
        console.log(`Game ${game.sequence_number} (${game.date}): Found ${gameRegistrations.length} total registrations`);
        
        // Filter for selected players only (not reserves) AND make sure they have player data
        const selectedPlayers = gameRegistrations.filter(
          reg => reg.status === 'selected' && reg.player
        );
        
        // Log any registrations without player data
        const missingPlayerData = gameRegistrations.filter(
          reg => reg.status === 'selected' && !reg.player
        );
        if (missingPlayerData.length > 0) {
          console.warn(`Game ${game.sequence_number}: ${missingPlayerData.length} selected players have no player data`, missingPlayerData);
        }
        
        // Calculate cost per person based on selected players count
        const playerCount = selectedPlayers.length || 1; // Avoid division by zero
        const costPerPerson = game.pitch_cost ? game.pitch_cost / playerCount : 0;

        console.log(`Game ${game.sequence_number}: ${selectedPlayers.length} selected players with data, cost per person: £${costPerPerson.toFixed(2)}`);

        return {
          ...game,
          cost_per_person: costPerPerson,
          game_registrations: selectedPlayers.map(reg => ({
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