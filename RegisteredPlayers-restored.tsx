import React from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../utils/supabase';
import PlayerCard from '../PlayerCard';
import { ExtendedPlayerData } from '../../types/playerSelection';
import { useGlobalXP } from '../../hooks/useGlobalXP';

interface Registration {
  player: ExtendedPlayerData;
  status: string;
  created_at: string;
}

interface RegisteredPlayersProps {
  registrations: Registration[];
  maxPlayers: number;
  randomSlots: number;
  gameId: string;
}

interface PlayerStats {
  xp: number;
  wins: number;
  draws: number;
  losses: number;
  total_games: number;
  win_rate: number;
  rarity: 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary';
}

interface GlobalRanking {
  id: string;
  xp: number;
  rank: number;
}

export const RegisteredPlayers: React.FC<RegisteredPlayersProps> = ({
  registrations,
  maxPlayers,
  randomSlots,
  gameId
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playerStats, setPlayerStats] = React.useState<Record<string, PlayerStats>>({});
  const [globalRankings, setGlobalRankings] = React.useState<GlobalRanking[]>([]);
  const [showPreview, setShowPreview] = React.useState(true);
  const { xpValues: globalXpValues, loading: globalXpLoading, error: globalXpError } = useGlobalXP();

  React.useEffect(() => {
    const fetchGlobalRankings = async () => {
      try {
        const { data, error } = await supabase
          .from('player_stats')
          .select('id, xp')
          .order('xp', { ascending: false });

        if (error) throw error;

        const rankings = data.map((player, index) => ({
          ...player,
          rank: index + 1
        }));

        console.log('Fetched global rankings:', {
          total: rankings.length,
          first5: rankings.slice(0, 5)
        });

        setGlobalRankings(rankings);
      } catch (err) {
        console.error('Error fetching global rankings:', err);
        setError('Failed to fetch global rankings');
      }
    };

    fetchGlobalRankings();
  }, []);

  React.useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const playerIds = registrations.map(reg => reg.player.id);

        const { data: winRatesData, error: winRatesError } = await supabase
          .rpc('get_player_win_rates');

        if (winRatesError) throw winRatesError;

        const { data: statsData, error: statsError } = await supabase
          .from('player_xp')
          .select('player_id, xp, rarity')
          .in('player_id', playerIds);

        if (statsError) throw statsError;

        const winRatesMap = new Map(winRatesData.map(wr => [wr.id, wr]));
        const playerXPMap = new Map(statsData.map(stat => [stat.player_id, {
          xp: stat.xp,
          rarity: stat.rarity
        }]));

        const statsLookup = playerIds.reduce((acc, playerId) => {
          const winRateData = winRatesMap.get(playerId);
          const playerXPData = playerXPMap.get(playerId);
          
          acc[playerId] = {
            xp: playerXPData?.xp || 0,
            wins: winRateData?.wins || 0,
            draws: winRateData?.draws || 0,
            losses: winRateData?.losses || 0,
            total_games: winRateData?.total_games || 0,
            win_rate: winRateData?.win_rate || 0,
            rarity: playerXPData?.rarity || 'Amateur'
          };
          return acc;
        }, {} as Record<string, PlayerStats>);

        setPlayerStats(statsLookup);
      } catch (error) {
        console.error('Error fetching player stats:', error);
        setError('Failed to fetch player stats');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();
  }, [registrations]);

  React.useEffect(() => {
    if (!loading && !error && registrations.length > 0 && globalRankings.length > 0) {
      console.log('Player Selection Debug Info:', JSON.stringify({
        gameConfig: {
          totalPlayers: maxPlayers,
          xpSlots: maxPlayers - randomSlots,
          randomSlots,
          currentlyRegistered: registrations.length
        },
        players: registrations
          .sort((a, b) => {
            const aXP = playerStats[a.player.id]?.xp || 0;
            const bXP = playerStats[b.player.id]?.xp || 0;
            return bXP - aXP;
          })
          .map((reg, registrationRank) => {
            const status = getSelectionStatus(reg.player.id, 
              reg.player.whatsapp_group_member === 'Yes' || reg.player.whatsapp_group_member === 'Proxy');
            return {
              friendlyName: reg.player.friendly_name,
              xp: playerStats[reg.player.id]?.xp || 0,
              globalRank: globalRankings.find(r => r.id === reg.player.id)?.rank || 0,
              registrationRank: registrationRank + 1,  // 1-based ranking
              isWhatsApp: reg.player.whatsapp_group_member === 'Yes' || reg.player.whatsapp_group_member === 'Proxy',
              status: status.status,
              label: status.label
            };
          })
          .sort((a, b) => (a.globalRank || 999) - (b.globalRank || 999))
      }, null, 2));
    }
  }, [loading, error, registrations, globalRankings, playerStats]);

  if (loading || globalXpLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error || globalXpError) {
    return (
      <div className="text-center text-error p-4">
        <p>{error || globalXpError}</p>
      </div>
    );
  }

  const getSelectionStatus = (
    playerId: string,
    isWhatsAppMember: boolean
  ) => {
    const playerRanking = globalRankings.find(r => r.id === playerId);
    const meritSlots = Number(maxPlayers) - Number(randomSlots);
    const totalRegistered = registrations.length;
    
    if (!playerRanking) return {
      status: 'unknown',
      label: 'Loading...',
      color: 'border-base-300'
    };

    // Sort players by XP only
    const sortedRegistrations = [...registrations].sort((a, b) => {
      const aXP = playerStats[a.player.id]?.xp || 0;
      const bXP = playerStats[b.player.id]?.xp || 0;
      return bXP - aXP;
    });

    // Find the XP cutoff for merit slots
    const meritCutoffIndex = meritSlots - 1;
    const meritCutoffXP = playerStats[sortedRegistrations[meritCutoffIndex]?.player.id]?.xp || 0;
    const playerXP = playerStats[playerId]?.xp || 0;

    // Case 1: Clear merit slots (higher XP than cutoff)
    if (playerXP > meritCutoffXP) {
      return {
        status: 'merit',
        label: `#${playerRanking.rank}`,
        color: 'border-success'
      };
    }

    // Case 2: Tied with merit cutoff - include in random selection
    if (playerXP === meritCutoffXP) {
      if (isWhatsAppMember) {
        return {
          status: 'random-priority',
          label: '100% Chance (WhatsApp)',
          color: 'border-warning'
        };
      }
      return {
        status: 'random',
        label: 'Random Selection',
        color: 'border-info'
      };
    }

    // Get remaining players after clear merit slots
    const remainingPlayers = sortedRegistrations.filter(reg => 
      (playerStats[reg.player.id]?.xp || 0) <= meritCutoffXP
    );
    
    // Find lowest XP that's not clearly in reserve
    const lowestNonReserveXP = Math.max(
      ...remainingPlayers
        .slice(0, -1) // Exclude the very last player
        .map(reg => playerStats[reg.player.id]?.xp || 0)
    );

    // Case 3: Lowest XP players go to reserve
    if (playerXP < lowestNonReserveXP || 
        (playerXP === lowestNonReserveXP && !isWhatsAppMember)) {
      return {
        status: 'reserve',
        label: isWhatsAppMember ? 'Reserve (WhatsApp)' : 'Reserve',
        color: 'border-error'
      };
    }

    // Case 4: WhatsApp members in random pool get priority
    if (isWhatsAppMember) {
      return {
        status: 'random-priority',
        label: '100% Chance (WhatsApp)',
        color: 'border-warning'
      };
    }

    // Case 5: Everyone else in the random pool
    return {
      status: 'random',
      label: 'Random Selection',
      color: 'border-info'
    };
  };

  const getSelectionPreviewText = () => {
    const meritSlots = Number(maxPlayers) - Number(randomSlots);
    const totalRegistered = registrations.length;

    // If game is exactly full, everyone gets a spot
    if (totalRegistered === Number(maxPlayers)) {
      return `• ${meritSlots} spots will be given to the top ranked players by XP\n• The remaining ${randomSlots} spot${randomSlots !== 1 ? 's' : ''} will be randomly assigned\n• All registered players will get a spot`;
    }

    // If we don't have enough players to fill all spots
    if (totalRegistered < Number(maxPlayers)) {
      const remainingSpots = Number(maxPlayers) - totalRegistered;
      if (totalRegistered <= meritSlots) {
        // All current registrations will get merit spots
        if (totalRegistered === 0) {
          return `• No players registered yet\n• ${maxPlayers} spots available`;
        }
        // Show current status but remind about final selection rules
        return `• ${totalRegistered} player${totalRegistered !== 1 ? 's' : ''} currently registered\n• ${remainingSpots} more spot${remainingSpots !== 1 ? 's' : ''} available\n• Final selection will be based on XP ranking and WhatsApp status when registration closes`;
      } else {
        // Some will be random selection
        const guaranteedSpots = Math.min(meritSlots, totalRegistered);
        let previewText = `• ${guaranteedSpots} spot${guaranteedSpots !== 1 ? 's' : ''} will be given to the top ranked players by XP\n`;
        
        // Handle random selection for current registrations
        const whatsAppMembers = registrations.filter(reg => 
          reg.player.whatsapp_group_member === 'Yes' || reg.player.whatsapp_group_member === 'Proxy'
        ).length;

        if (whatsAppMembers > 0) {
          previewText += `• ${whatsAppMembers} WhatsApp member${whatsAppMembers !== 1 ? 's' : ''} will be prioritized for random selection\n`;
        }
        
        previewText += `• ${remainingSpots} more spot${remainingSpots !== 1 ? 's' : ''} available\n• Final selection will be based on XP ranking and WhatsApp status when registration closes`;
        return previewText;
      }
    }

    // Original logic for full/oversubscribed games
    const nonMeritPlayers = registrations.filter(reg => {
      const regRanking = globalRankings.find(r => r.id === reg.player.id);
      return regRanking && regRanking.rank > meritSlots;
    });

    const whatsAppMembers = nonMeritPlayers.filter(reg => 
      reg.player.whatsapp_group_member === 'Yes' || reg.player.whatsapp_group_member === 'Proxy'
    );

    let previewText = `• ${meritSlots} spots will be given to the top ranked players by XP\n`;

    if (whatsAppMembers.length > 0) {
      if (whatsAppMembers.length <= Number(randomSlots)) {
        previewText += `• All ${whatsAppMembers.length} WhatsApp member${whatsAppMembers.length !== 1 ? 's' : ''} will get the remaining ${randomSlots} random spot${randomSlots !== 1 ? 's' : ''}`;
      } else {
        const unselectedCount = whatsAppMembers.length - Number(randomSlots);
        previewText += `• ${randomSlots} of the ${whatsAppMembers.length} WhatsApp members will be randomly selected\n`;
        previewText += `• The remaining ${unselectedCount} WhatsApp member${unselectedCount > 1 ? 's' : ''} will be placed as ${unselectedCount > 1 ? 'reserves' : 'a reserve'} in XP order`;
      }

      const remainingSlots = Math.max(0, Number(randomSlots) - whatsAppMembers.length);
      if (remainingSlots > 0) {
        const nonWhatsAppCount = nonMeritPlayers.length - whatsAppMembers.length;
        if (nonWhatsAppCount > 0) {
          previewText += `\n• ${remainingSlots} spot${remainingSlots > 1 ? 's' : ''} will be randomly assigned from the remaining ${nonWhatsAppCount} player${nonWhatsAppCount > 1 ? 's' : ''}`;
        } else {
          previewText += `\n• ${remainingSlots} random spot${remainingSlots > 1 ? 's' : ''} still available`;
        }
      } else {
        const nonWhatsAppCount = nonMeritPlayers.length - whatsAppMembers.length;
        if (nonWhatsAppCount > 0) {
          previewText += `\n• The remaining ${nonWhatsAppCount} non-WhatsApp member${nonWhatsAppCount > 1 ? 's' : ''} will be placed as ${nonWhatsAppCount > 1 ? 'reserves' : 'a reserve'} in XP order`;
        }
      }
    } else {
      if (nonMeritPlayers.length > 0) {
        previewText += `• ${randomSlots} spot${randomSlots > 1 ? 's' : ''} will be randomly assigned from the remaining ${nonMeritPlayers.length} player${nonMeritPlayers.length > 1 ? 's' : ''}`;
      } else {
        previewText += `• ${randomSlots} random spot${randomSlots > 1 ? 's' : ''} still available`;
      }
    }

    return previewText;
  };

  const sortedRegistrations = [...registrations].sort((a, b) => {
    const aXP = playerStats[a.player.id]?.xp || 0;
    const bXP = playerStats[b.player.id]?.xp || 0;
    
    // First sort by XP
    if (bXP !== aXP) {
      return bXP - aXP;
    }
    
    // If XP is tied, sort by registration timestamp
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Preview Section */}
      <div className="flex flex-col gap-2">
        <button 
          onClick={() => setShowPreview(!showPreview)} 
          className="btn btn-sm btn-ghost gap-2 self-start"
        >
          {showPreview ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
          Live Selection Preview
        </button>

        {showPreview && (
          <div className="alert alert-info shadow-lg">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <div className="text-sm space-y-2">
                  {getSelectionPreviewText().split('\n').map((line, index) => (
                    line ? <p key={index}>{line}</p> : null
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Badge Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="badge badge-success gap-2">Guaranteed (Top XP)</div>
        <div className="badge badge-warning gap-2">WhatsApp Priority</div>
        <div className="badge badge-info gap-2">Standard Random Selection</div>
      </div>

      {/* Player Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 justify-items-center sm:justify-items-stretch">
        {sortedRegistrations.map((registration, index) => {
          const stats = playerStats[registration.player.id] || {
            xp: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            total_games: 0,
            win_rate: 0,
            rarity: 'Amateur'
          };

          const selectionStatus = getSelectionStatus(
            registration.player.id,
            registration.player.whatsapp_group_member === 'Yes' || registration.player.whatsapp_group_member === 'Proxy'
          );

          // Add divider after XP slots
          const showDivider = index === Number(maxPlayers) - Number(randomSlots) - 1;
          
          return (
            <React.Fragment key={registration.player.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                {/* Selection status badge */}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <div className={`badge ${selectionStatus.color.replace('border', 'bg')} ${selectionStatus.status === 'random' ? 'bg-info text-info-content' : 'text-white'} shadow-md`}>
                    {selectionStatus.label}
                  </div>
                </div>

                <PlayerCard
                  id={registration.player.id}
                  friendlyName={registration.player.friendly_name}
                  xp={stats.xp}
                  caps={registration.player.caps}
                  preferredPosition={registration.player.preferred_position || ''}
                  activeBonuses={registration.player.active_bonuses}
                  activePenalties={registration.player.active_penalties}
                  winRate={stats.win_rate}
                  currentStreak={registration.player.current_streak}
                  maxStreak={registration.player.max_streak}
                  wins={stats.wins}
                  draws={stats.draws}
                  losses={stats.losses}
                  totalGames={stats.total_games}
                  rarity={stats.rarity}
                  avatarSvg={registration.player.avatar_svg}
                  status={registration.status === 'reserve' ? 'reserve' : undefined}
                  whatsapp_group_member={registration.player.whatsapp_group_member}
                />
              </motion.div>
              {showDivider && (
                <div className="col-span-full my-4">
                  <div className="border-t-2 border-base-300 relative">
                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-100 px-4 text-sm text-base-content/60">
                      Random Selection Below
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
