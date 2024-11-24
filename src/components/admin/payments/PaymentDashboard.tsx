import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../utils/supabase';
import PaymentSummary from './PaymentSummary';
import GamePaymentList from './GamePaymentList';
import { Game } from '../../../types/game';

const PaymentDashboard: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchGames();
  }, [showArchived]);

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          game_registrations (
            *,
            player:players (*),
            paid_by:players (*),
            payment_recipient:players (*)
          ),
          venue:venues (*)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto p-4"
    >
      <h1 className="text-3xl font-bold mb-6">Payment Management</h1>
      
      <PaymentSummary games={games} />
      
      <div className="flex justify-end mb-4">
        <label className="label cursor-pointer">
          <span className="label-text mr-2">Show Archived Games</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
        </label>
      </div>

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