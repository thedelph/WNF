import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase, supabaseAdmin } from '../../utils/supabase';
import { PiCoinDuotone } from "react-icons/pi";
import { toast } from 'react-hot-toast';
import { useAdmin } from '../../hooks/useAdmin';
import { TokenTable } from '../../components/admin/tokens/TokenTable';
import { TokenStats } from '../../components/admin/tokens/TokenStats';
import { TokenData } from '../../types/tokens';

const TokenManagement: React.FC = () => {
  const { isAdmin } = useAdmin();
  const [tokenData, setTokenData] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all players and their token status
  const fetchTokenData = async () => {
    try {
      setLoading(true);
      
      // First get all WhatsApp group members
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, friendly_name, whatsapp_group_member')
        .in('whatsapp_group_member', ['Yes', 'Proxy'])
        .order('friendly_name');

      if (playersError) {
        console.error('Error fetching players:', playersError);
        throw playersError;
      }

      // Then get active or recently used tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('player_tokens')
        .select('*')
        .order('issued_at', { ascending: false });

      if (tokensError) {
        console.error('Error fetching tokens:', tokensError);
        throw tokensError;
      }

      // Get the 3 most recently completed games
      const { data: latestGames, error: gamesError } = await supabase
        .from('games')
        .select('id, date, sequence_number')
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(3);

      if (gamesError) {
        console.error('Error fetching games:', gamesError);
        throw gamesError;
      }

      console.log('Latest games:', latestGames);

      // Get registrations for these games
      const { data: gameRegistrations, error: registrationsError } = await supabase
        .from('game_registrations')
        .select('player_id, game_id, status')
        .in('game_id', latestGames?.map(g => g.id) || []);

      if (registrationsError) {
        console.error('Error fetching registrations:', registrationsError);
        throw registrationsError;
      }

      console.log('Game registrations:', gameRegistrations);

      // Create a map of player IDs to their eligibility status and played games
      const eligibilityMap = new Map();
      players.forEach(player => {
        const playerGames = gameRegistrations?.filter(gr => gr.player_id === player.id) || [];
        const selectedGames = playerGames
          .filter(g => g.status === 'selected')
          .map(g => {
            const game = latestGames?.find(lg => lg.id === g.game_id);
            return {
              id: game?.id,
              date: game?.date,
              // Format as "WNF #123"
              display: game?.sequence_number ? `WNF #${game.sequence_number}` : 'Unknown Game'
            };
          });
        
        eligibilityMap.set(player.id, {
          is_eligible: selectedGames.length === 0,
          selected_games: selectedGames
        });
      });

      // Create a map of player IDs to their most recent token
      const tokenMap = new Map();
      tokens?.forEach(token => {
        if (!tokenMap.has(token.player_id)) {
          tokenMap.set(token.player_id, token);
        }
      });

      // Combine player data with their token and eligibility status
      const formattedData = players.map(player => {
        const eligibility = eligibilityMap.get(player.id);
        return {
          id: tokenMap.get(player.id)?.id || player.id,
          player_id: player.id,
          friendly_name: player.friendly_name,
          whatsapp_group_member: player.whatsapp_group_member,
          is_eligible: eligibility.is_eligible,
          selected_games: eligibility.selected_games,
          issued_at: tokenMap.get(player.id)?.issued_at || null,
          expires_at: tokenMap.get(player.id)?.expires_at || null,
          used_at: tokenMap.get(player.id)?.used_at || null,
          used_game_id: tokenMap.get(player.id)?.used_game_id || null
        };
      });

      setTokenData(formattedData);
    } catch (error) {
      console.error('Error fetching token data:', error);
      toast.error('Failed to load token data');
    } finally {
      setLoading(false);
    }
  };

  // Handle issuing a new token
  const handleIssueToken = async (playerId: string) => {
    try {
      console.log('Attempting to issue token for player:', playerId);
      
      // First, check if player has any active tokens
      const { data: existingTokens, error: checkError } = await supabase
        .from('player_tokens')
        .select('id')
        .eq('player_id', playerId)
        .is('used_at', null)
        .is('used_game_id', null)
        .gt('expires_at', new Date().toISOString());

      if (checkError) {
        console.error('Error checking existing tokens:', checkError);
        throw checkError;
      }

      if (existingTokens && existingTokens.length > 0) {
        toast.error('Player already has an active token');
        return;
      }

      // Issue new token
      const { error: insertError } = await supabaseAdmin
        .from('player_tokens')
        .insert({
          player_id: playerId,
          issued_at: new Date().toISOString(),
          expires_at: null
        });

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw insertError;
      }

      toast.success('Token issued successfully');
      await fetchTokenData();
    } catch (error) {
      console.error('Error issuing token:', error);
      toast.error('Failed to issue token');
    }
  };

  // Handle removing a token
  const handleRemoveToken = async (tokenId: string) => {
    try {
      console.log('Attempting to remove token:', tokenId);
      
      // Delete the token - this allows immediate reissue since it wasn't used in a game
      const { error: deleteError } = await supabaseAdmin
        .from('player_tokens')
        .delete()
        .eq('id', tokenId);

      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        throw deleteError;
      }

      toast.success('Token removed successfully');
      await fetchTokenData();
    } catch (error) {
      console.error('Error removing token:', error);
      toast.error('Failed to remove token');
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    fetchTokenData();
  }, [isAdmin]);

  const filteredTokenData = tokenData.filter(player =>
    player.friendly_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return <div className="text-center mt-8">Access denied. Admin only.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <PiCoinDuotone className="text-yellow-500" />
          Token Management
        </h1>
      </motion.div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-6">
            <div className="form-control w-full max-w-xs">
              <input
                type="text"
                placeholder="Search players..."
                className="input input-bordered w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <TokenStats tokens={tokenData} />
          </div>

          <TokenTable 
            tokens={filteredTokenData}
            loading={loading}
            onRemoveToken={handleRemoveToken}
            onIssueToken={handleIssueToken}
          />
        </div>
      </div>
    </div>
  );
};

export default TokenManagement;
