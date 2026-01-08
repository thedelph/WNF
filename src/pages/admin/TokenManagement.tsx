import React, { useEffect, useState } from 'react';
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
  const [allTokens, setAllTokens] = useState<TokenData[]>([]); // Store all tokens for stats
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

      // Get ALL tokens (both used and unused) for comprehensive statistics
      const { data: tokens, error: tokensError } = await supabase
        .from('player_tokens')
        .select('*')
        .order('issued_at', { ascending: false });

      if (tokensError) {
        console.error('Error fetching tokens:', tokensError);
        throw tokensError;
      }

      // Get the 10 most recently completed games for checking recent activity
      const { data: latestGames, error: gamesError } = await supabase
        .from('games')
        .select('id, date, sequence_number')
        .eq('status', 'completed')
        .order('sequence_number', { ascending: false })
        .limit(10);

      if (gamesError) {
        console.error('Error fetching games:', gamesError);
        throw gamesError;
      }

      // Get registrations for these games
      const { data: gameRegistrations, error: registrationsError } = await supabase
        .from('game_registrations')
        .select('player_id, game_id, status')
        .in('game_id', latestGames?.map(g => g.id) || []);

      if (registrationsError) {
        console.error('Error fetching registrations:', registrationsError);
        throw registrationsError;
      }
      
      // Get unpaid games data - calculate directly instead of using the view
      // This replaces the problematic player_unpaid_games_view query
      const { data: unpaidRegistrations, error: unpaidRegistrationsError } = await supabase
        .from('game_registrations')
        .select('player_id')
        .eq('status', 'selected')
        .eq('paid', false);
        
      if (unpaidRegistrationsError) {
        console.error('Error fetching unpaid registrations:', unpaidRegistrationsError);
        throw unpaidRegistrationsError;
      }
      
      // Create a map of player IDs to their unpaid games count
      const unpaidGamesMap = new Map();
      
      // Count unpaid games for each player
      unpaidRegistrations?.forEach(registration => {
        const playerId = registration.player_id;
        const currentCount = unpaidGamesMap.get(playerId) || 0;
        unpaidGamesMap.set(playerId, currentCount + 1);
      });

      // Create a map of player IDs to their eligibility status and played games
      const eligibilityMap = new Map();
      players.forEach(player => {
        const playerGames = gameRegistrations?.filter(gr => gr.player_id === player.id) || [];

        // Get all selected OR dropped out games for this player, sorted by sequence number descending
        // Dropouts count as being selected for token eligibility purposes
        const selectedGames = playerGames
          .filter(g => g.status === 'selected' || g.status === 'dropped_out')
          .map(g => {
            const game = latestGames?.find(lg => lg.id === g.game_id);
            return {
              id: game?.id,
              date: game?.date,
              sequence_number: game?.sequence_number,
              display: game?.sequence_number ? `WNF #${game.sequence_number}` : 'Unknown Game',
              status: g.status
            };
          })
          .sort((a, b) => (b.sequence_number || 0) - (a.sequence_number || 0));

        // Get the 3 most recent games
        const lastThreeGames = latestGames?.slice(0, 3) || [];
        const lastThreeGameIds = new Set(lastThreeGames.map(g => g.id));

        // Find which of the last 3 games the player was selected in OR dropped out of
        const selectedInLastThree = selectedGames.filter(g =>
          lastThreeGameIds.has(g.id)
        );

        // Check if player has played (been selected, not dropped out) in at least one of the last 10 games
        const lastTenGameIds = new Set(latestGames?.map(g => g.id) || []);
        const hasRecentActivity = playerGames.some(g =>
          lastTenGameIds.has(g.game_id) && g.status === 'selected'
        );
        
        // Check if player has any outstanding payments
        const hasOutstandingPayments = unpaidGamesMap.has(player.id) && unpaidGamesMap.get(player.id) > 0;
        const unpaidCount = unpaidGamesMap.get(player.id) || 0;

        // Debug logging for Mike M, Mike B, and Lee S
        if (['Mike M', 'Mike B', 'Lee S'].includes(player.friendly_name)) {
          console.log(`Debug ${player.friendly_name}:`);
          console.log('Latest games:', latestGames?.map(g => g.sequence_number));
          console.log('Last 3 games:', lastThreeGames.map(g => g.sequence_number));
          console.log('Selected in games:', selectedInLastThree.map(g => g.sequence_number));
          console.log('Has activity in last 10:', hasRecentActivity);
          console.log('Has outstanding payments:', hasOutstandingPayments);
          console.log('Unpaid count:', unpaidCount);
          console.log('Selected games:', selectedGames);
        }
        
        // Create contextual reason message based on game statuses
        let reason = null;
        if (!hasRecentActivity) {
          reason = 'No activity in last 10 games';
        } else if (selectedInLastThree.length > 0) {
          // Build contextual message showing selected vs dropped out
          reason = selectedInLastThree
            .map(g => `${g.status === 'dropped_out' ? 'Dropped out in' : 'Selected in'} ${g.display}`)
            .join(', ');
        } else if (hasOutstandingPayments) {
          reason = `Has ${unpaidCount} unpaid game(s)`;
        }

        eligibilityMap.set(player.id, {
          is_eligible: hasRecentActivity && selectedInLastThree.length === 0 && !hasOutstandingPayments,
          selected_games: selectedGames,
          unpaid_games: unpaidCount,
          reason
        });
      });

      // Create a map of player IDs to their most recent token
      const tokenMap = new Map();
      tokens?.forEach(token => {
        const isActive = !token.used_at && (!token.expires_at || new Date(token.expires_at) > new Date());
        if (!tokenMap.has(token.player_id) && isActive) {
          tokenMap.set(token.player_id, token);
        }
      });

      // Combine player data with their token and eligibility status
      const formattedData = players.map(player => {
        const eligibility = eligibilityMap.get(player.id);
        const token = tokenMap.get(player.id);

        // If player is eligible, they should get a fresh token
        // If not eligible, any existing token should be expired
        const shouldHaveToken = eligibility?.is_eligible;

        // A token is only valid if:
        // 1. The player is currently eligible
        // 2. The token exists and hasn't been used
        const hasValidToken = shouldHaveToken && token && !token.used_at;

        return {
          id: token?.id || player.id,
          player_id: player.id,
          friendly_name: player.friendly_name,
          whatsapp_group_member: player.whatsapp_group_member,
          is_eligible: eligibility?.is_eligible,
          selected_games: eligibility?.selected_games,
          unpaid_games: eligibility?.unpaid_games,
          reason: eligibility?.reason,
          issued_at: hasValidToken ? token?.issued_at : null,
          expires_at: hasValidToken ? token?.expires_at : null,
          used_at: token?.used_at || null,
          used_game_id: token?.used_game_id || null
        };
      });

      setTokenData(formattedData);

      // Store all tokens (with player names) for TokenStats
      // This includes both used and unused tokens for accurate statistics
      const allTokensWithNames = tokens?.map(token => {
        const player = players.find(p => p.id === token.player_id);
        const eligibility = eligibilityMap.get(token.player_id);
        return {
          id: token.id,
          player_id: token.player_id,
          friendly_name: player?.friendly_name || 'Unknown',
          whatsapp_group_member: player?.whatsapp_group_member,
          is_eligible: eligibility?.is_eligible,
          selected_games: eligibility?.selected_games,
          unpaid_games: eligibility?.unpaid_games,
          reason: eligibility?.reason,
          issued_at: token.issued_at,
          expires_at: token.expires_at,
          used_at: token.used_at,
          used_game_id: token.used_game_id
        };
      }) || [];

      // Combine tokens with player data to ensure we have eligibility for all players
      // Players without tokens still need to be counted for eligibility stats
      const playersWithoutActiveTokens = formattedData.filter(
        player => !allTokensWithNames.some(token => token.player_id === player.player_id)
      );

      setAllTokens([...allTokensWithNames, ...playersWithoutActiveTokens]);
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
        .or('expires_at.is.null,expires_at.gt.now()');

      if (checkError) {
        console.error('Error checking existing tokens:', checkError);
        throw checkError;
      }

      if (existingTokens && existingTokens.length > 0) {
        toast.error('Player already has an active token');
        return;
      }

      // Use a direct RPC call to issue_token function instead of inserting directly
      // This bypasses the materialized view permission issue
      const { error: insertError } = await supabaseAdmin
        .rpc('issue_player_token', { player_uuid: playerId });

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

  // Initial load
  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    fetchTokenData();
  }, [isAdmin]);

  // Debug logging for token data
  useEffect(() => {
    if (tokenData.length > 0) {
      console.log('Token data loaded:', tokenData.length, 'players');
      console.log('Active tokens:', tokenData.filter(token => 
        !token.used_at && (!token.expires_at || new Date(token.expires_at) > new Date())
      ).length);
    }
  }, [tokenData]);

  const filteredTokenData = tokenData.filter(player =>
    player.friendly_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return <div className="text-center mt-8">Access denied. Admin only.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <PiCoinDuotone className="text-yellow-500" />
          Token Management
        </h1>
        <button
          onClick={() => {
            setLoading(true);
            fetchTokenData();
          }}
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-6">
            <fieldset className="fieldset w-full max-w-xs">
              <input
                type="text"
                placeholder="Search players..."
                className="input w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </fieldset>

            <TokenStats tokens={allTokens} />
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
