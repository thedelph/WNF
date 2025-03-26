'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import AvatarCreator from '../components/AvatarCreator'
import PaymentHistory from '../components/profile/PaymentHistory'
import XPBreakdown from '../components/profile/XPBreakdown'
import StatsGrid from '../components/profile/StatsGrid'
import TokenStatus from '../components/profile/TokenStatus'
import { useTokenStatus } from '../hooks/useTokenStatus'

// Helper function to format date
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Helper function to retry Supabase queries
async function executeWithRetry<T>(queryFn: () => Promise<T>, options = { maxRetries: 3, shouldToast: true }): Promise<T> {
  const { maxRetries, shouldToast } = options;
  let lastError: any = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  if (shouldToast) {
    toast.error('Failed to load data after multiple attempts');
  }
  
  throw lastError;
}

interface PlayerProfile {
  friendly_name: string;
  current_stored_xp: number;
  base_xp: number;
  reserve_xp: number;
  reserve_games: number;
  subtotal_before_modifiers: number;
  attendance_streak: number;
  attendance_streak_modifier: number;
  reserve_game_modifier: number;
  registration_streak: number;
  registration_streak_modifier: number;
  unpaid_games_count: number;
  unpaid_games_modifier: number;
  total_xp: number;
  rarity?: string;
  current_streak?: number;
  max_streak?: number;
  avatar_svg?: string | null;
  avatar_options?: any;
  token?: {
    status: string;
    last_used_at: string | null;
    next_token_at: string | null;
    created_at: string;
  };
}

interface ExtendedPlayerData {
  id: string;
  user_id: string;
  friendly_name: string;
  avatar_svg: string | null;
  avatar_options: any;
  current_streak: number;
  max_streak: number;
  xp: number;
  total_xp?: number;
  rank: number;
  rarity: string;
  reserveXP: number;
  whatsapp_group_member: boolean;
  registration_streak?: number;
  gameSequences?: Array<{
    sequence: number;
    status: string;
    team: string;
  }>;
  win_rate?: number;
  recent_win_rate?: number;
  highestXP?: number;
  highestXPSnapshotDate?: string;
  maxStreakDate?: string;
  caps?: number;
  reserve_games?: number;
  bench_warmer_streak?: number;
  registrationStreak?: number;
  registrationStreakApplies?: boolean;
  unpaidGames?: number;
  latestSequence?: number;
}

// Calculate rarity percentile based on player's XP compared to all players
const calculateRarity = (playerXP: number, allXP: number[]): number => {
  const totalPlayers = allXP.length;
  const playersBelow = allXP.filter(xp => xp < playerXP).length;
  return Math.round((playersBelow / totalPlayers) * 100);
};

export default function Component() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ExtendedPlayerData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [playerId, setPlayerId] = useState<string>()
  const [gameSequences, setGameSequences] = useState<any[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAvatarCreator, setShowAvatarCreator] = useState(false)
  const [showEditModal, setShowEditModal] = useState<string | null>(null)
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false)
  const { tokenStatus } = useTokenStatus(playerId || '')

  // Function to load profile data
  const loadProfile = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Wrap everything in try/catch blocks to prevent null errors
      try {
        // Get player data
        const { data: playerData, error: playerError } = await executeWithRetry(
          () => supabase
            .from('players')
            .select(`
              id,
              user_id,
              friendly_name,
              avatar_svg,
              avatar_options,
              current_streak,
              max_streak,
              caps,
              whatsapp_group_member,
              player_xp (
                xp,
                rank,
                rarity
              )
            `)
            .eq('user_id', user?.id)
            .single()
        );

        if (playerError) {
          console.error('Error fetching player data:', playerError);
          toast.error('Failed to load profile data');
          setLoading(false);
          return;
        }

        // Store player ID for token status hook
        if (!playerData) {
          toast.error('Player not found');
          setLoading(false);
          return;
        }

        setPlayerId(playerData.id);

        // Get max streak date from the winning streaks function
        interface StreakDataType {
          id: string;
          friendly_name: string;
          current_win_streak: number;
          max_win_streak: number;
          max_streak_date: string | null;
        }

        let streakData = null;
        let maxStreakDate = null;

        try {
          const streakResponse = await executeWithRetry(() => 
            supabase
              .rpc('get_player_winning_streaks')
              .eq('id', playerData.id)
              .single()
          );

          if (streakResponse.error) {
            console.error('Error fetching streak data:', streakResponse.error);
            // Continue without streak date data
          } else if (streakResponse.data) {
            // Type assertion for streak data
            streakData = streakResponse.data;
            maxStreakDate = streakData?.max_streak_date ? formatDate(streakData.max_streak_date) : null;
            console.log('Max streak date:', maxStreakDate);
          }
        } catch (streakError) {
          console.error('Error in streak data processing:', streakError);
          // Continue without streak data
        }

        // Fetch player win rates and other data with better error handling
        let winRatesResult = { data: null };
        let recentWinRatesResult = { data: null };
        let streakStatsResult = { data: null, error: null };

        try {
          const winRatesPromise = supabase.rpc('get_player_win_rates');
          const recentWinRatesPromise = supabase.rpc('get_player_recent_win_rates');

          // Fetch player streak stats for the correct max streak value
          const streakStatsPromise = supabase
            .from('player_streak_stats')
            .select('friendly_name, longest_streak, longest_streak_period')
            .eq('friendly_name', playerData.friendly_name)
            .single();

          [winRatesResult, recentWinRatesResult, streakStatsResult] = await Promise.all([
            winRatesPromise,
            recentWinRatesPromise,
            streakStatsPromise
          ]);
        } catch (dataFetchError) {
          console.error('Error fetching additional player data:', dataFetchError);
          // Continue with partial data
        }

        let winRate = null;
        let recentWinRate = null;
        let correctMaxStreak = playerData.max_streak || 0; // Default to the value from players table

        if (winRatesResult.data) {
          const playerWinRate = winRatesResult.data.find((wr: any) => wr.id === playerData?.id);
          if (playerWinRate) {
            winRate = playerWinRate.win_rate;
          }
        }

        if (recentWinRatesResult.data) {
          const playerRecentWinRate = recentWinRatesResult.data.find((wr: any) => wr.id === playerData?.id);
          if (playerRecentWinRate) {
            recentWinRate = playerRecentWinRate.recent_win_rate;
          }
        }

        // Use the max streak from player_streak_stats if available
        if (streakStatsResult.data && streakStatsResult.data.longest_streak) {
          correctMaxStreak = streakStatsResult.data.longest_streak;
          console.log('Using max streak from player_streak_stats:', correctMaxStreak);
        } else if (streakStatsResult.error) {
          console.error('Error fetching streak stats:', streakStatsResult.error);
        }

        // Get highest XP record for the player with better error handling
        let highestXPData = null;
        try {
          const highestXPResult = await executeWithRetry(
            () => supabase
              .from('highest_xp_records_view')
              .select('xp, snapshot_date')
              .eq('player_id', playerData.id)
              .single()
          );

          if (highestXPResult.error) {
            if (!highestXPResult.error.message?.includes('404')) {
              console.error('Error fetching highest XP data:', highestXPResult.error);
            }
            // Continue without highest XP data
          } else {
            highestXPData = highestXPResult.data;
          }
        } catch (highestXPError) {
          console.error('Error processing highest XP data:', highestXPError);
          // Continue without highest XP data
        }

        // Get XP breakdown from player_xp table with better error handling
        let xpData = null;
        try {
          const xpResult = await executeWithRetry(
            () => supabase
              .from('player_xp')
              .select('*')
              .eq('player_id', playerData.id)
              .single()
          );

          if (xpResult.error) {
            console.error('Error fetching XP data:', xpResult.error);
            toast.error('Failed to load XP data');
          } else {
            xpData = xpResult.data;
          }
        } catch (xpError) {
          console.error('Error processing XP data:', xpError);
          toast.error('Failed to process XP data');
        }

        // Combine the data with safe access
        const profileData: ExtendedPlayerData = {
          id: playerData.id,
          user_id: playerData.user_id,
          friendly_name: playerData.friendly_name,
          avatar_svg: playerData.avatar_svg,
          avatar_options: playerData.avatar_options,
          // Fix XP access - use player_xp data directly if available, otherwise use xpData
          xp: xpData?.xp || (playerData.player_xp && playerData.player_xp[0] ? playerData.player_xp[0].xp : 0),
          total_xp: xpData?.xp || (playerData.player_xp && playerData.player_xp[0] ? playerData.player_xp[0].xp : 0),
          reserveXP: xpData?.reserve_xp || 0,
          rank: playerData.player_xp && playerData.player_xp[0] ? playerData.player_xp[0].rank : 0,
          rarity: xpData?.rarity || (playerData.player_xp && playerData.player_xp[0] ? playerData.player_xp[0].rarity : 'Amateur'),
          current_streak: playerData.current_streak || 0,
          max_streak: correctMaxStreak,
          maxStreakDate: maxStreakDate || undefined,
          whatsapp_group_member: playerData.whatsapp_group_member || false,
          win_rate: winRate,
          recent_win_rate: recentWinRate,
          highestXP: highestXPData?.xp,
          highestXPSnapshotDate: highestXPData?.snapshot_date ? formatDate(highestXPData.snapshot_date) : undefined,
          caps: playerData.caps || 0
        };

        // Add debug logs to track XP data
        console.log('Player XP data:', {
          playerXP: playerData.player_xp && playerData.player_xp[0] ? playerData.player_xp[0].xp : 'No player_xp data',
          xpDataTotal: xpData?.xp || 'No total_xp in xpData',
          finalXP: profileData.xp,
          finalTotalXP: profileData.total_xp
        });

        setProfile(profileData);

        // Now that we have the player data, get the latest sequence number and registrations
        try {
          const { data: latestSeqData } = await executeWithRetry(
            () => supabase
              .from('games')
              .select('sequence_number')
              .eq('completed', true)
              .order('sequence_number', { ascending: false })
              .limit(1)
          );

          // Get the latest sequence number from the result
          const latestSequence = latestSeqData && latestSeqData.length > 0 ? latestSeqData[0].sequence_number : 0;
          
          // Get player's game registrations
          const { data: registrationsData } = await executeWithRetry(
            () => supabase
              .from('game_registrations')
              .select(`
                status,
                games (
                  sequence_number,
                  is_historical
                )
              `)
              .eq('player_id', playerData.id)
              .order('created_at', { ascending: false })
          );

          // Update the profile with game sequences
          const registrations = registrationsData || [];
          const updatedProfileData = {
            ...profileData,
            gameSequences: registrations?.map((reg: any) => ({
              sequence: reg.games.sequence_number,
              status: reg.status,
              is_historical: reg.games.is_historical
            })) || [],
            latestSequence: latestSequence // Add latest sequence to profile data
          };

          setProfile(updatedProfileData);
        } catch (gameDataError) {
          console.error('Error fetching game data:', gameDataError);
          // Continue with partial profile data
        }
      } catch (innerError) {
        console.error('Inner error in loadProfile:', innerError);
        const errorMessage = innerError && typeof innerError === 'object' && 'message' in innerError 
          ? innerError.message 
          : 'Failed to load profile data';
        setError(errorMessage);
        toast.error('Error loading profile data. Please try refreshing the page.');
      }
    } catch (outerError) {
      console.error('Outer error in loadProfile:', outerError);
      // Use a safe way to extract the error message
      const errorMessage = 'Failed to load profile data';
      setError(errorMessage);
      toast.error('Error loading profile data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  // Set up real-time subscription for profile updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `user_id=eq.${user.id}`
        },
        (_reg: any) => {
          loadProfile()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user?.id])

  const handleEditProfile = () => setIsEditing(true)

  const handleSaveProfile = async () => {
    if (!profile) {
      toast.error('Please fill in all fields.')
      return
    }

    const restrictedNames = ['admin', 'administrator']
    if (restrictedNames.includes(profile.friendly_name.toLowerCase())) {
      toast.error('Friendly name cannot be "admin" or "administrator".')
      return
    }

    try {
      const { error } = await supabase
        .from('players')
        .update({ friendly_name: profile.friendly_name })
        .eq('user_id', user!.id)

      if (error) throw error

      setProfile((prevProfile) => ({
        ...prevProfile!,
        friendly_name: profile.friendly_name,
      }))

      toast.success('Profile updated successfully!!')
      setIsEditing(false)
    } catch (error) {
      toast.error('Error updating profile')
    }
  }

  const handleAvatarSave = async (avatarOptions: any, avatarUrl: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({ 
          avatar_options: avatarOptions,
          avatar_svg: avatarUrl
        })
        .eq('user_id', user!.id)

      if (error) throw error

      setProfile((prevProfile) => ({
        ...prevProfile!,
        avatar_options: avatarOptions,
        avatar_svg: avatarUrl
      }))

      setIsAvatarEditorOpen(false)
      toast.success('Avatar updated successfully!')
    } catch (error) {
      toast.error('Error updating avatar')
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 sm:space-y-8"
      >
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="alert alert-error"
          >
            <span>{error}</span>
          </motion.div>
        )}

        {isLoading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center items-center min-h-[60vh]"
          >
            <span className="loading loading-spinner loading-lg"></span>
          </motion.div>
        ) : profile ? (
          <>
            {/* Profile Header Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-base-200 rounded-box p-6 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                {/* Avatar Section */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group"
                >
                  <img 
                    src={profile.avatar_svg || '/src/assets/default-avatar.svg'} 
                    alt="Avatar" 
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full cursor-pointer shadow-md transition-transform"
                    onClick={() => setIsAvatarEditorOpen(true)}
                  />
                  <div 
                    className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center"
                    onClick={() => setIsAvatarEditorOpen(true)}
                  >
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                  </div>
                </motion.div>

                {/* Name and Email Section */}
                <div className="flex-grow space-y-3">
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <motion.input 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        type="text" 
                        value={profile.friendly_name} 
                        onChange={(e) => setProfile((prevProfile) => ({ ...prevProfile!, friendly_name: e.target.value }))} 
                        className="input input-bordered text-xl sm:text-2xl font-bold w-full max-w-xs"
                        placeholder="Enter your friendly name"
                      />
                    ) : (
                      <motion.h1 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-2xl sm:text-3xl font-bold"
                      >
                        {profile.friendly_name}
                      </motion.h1>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsEditing(true)}
                      className="btn btn-ghost btn-sm"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                        />
                      </svg>
                    </motion.button>
                  </div>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-base-content/70"
                  >
                    {user.email}
                  </motion.p>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <span className="badge badge-primary">{profile.rarity}</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Stats Grid Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <StatsGrid stats={{
                id: profile.id,
                friendly_name: profile.friendly_name,
                xp: profile.xp,
                current_streak: profile.current_streak || 0,
                max_streak: profile.max_streak || 0,
                max_streak_date: profile.maxStreakDate || undefined,
                rarity: profile.rarity,
                win_rate: profile.win_rate,
                recent_win_rate: profile.recent_win_rate,
                active_bonuses: 0, // Default values if not present in profile
                active_penalties: 0,
                highest_xp: profile.highestXP,
                highest_xp_date: profile.highestXPSnapshotDate || undefined,
                caps: profile.caps || 0,
                latestSequence: profile.latestSequence || 0 // Pass latest sequence to StatsGrid
              }} />
            </motion.div>

            {/* XP Breakdown Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-base-200 rounded-box p-6 shadow-lg"
            >
              <h2 className="text-xl sm:text-2xl font-bold mb-4">XP Breakdown</h2>
              <XPBreakdown stats={{
                caps: profile.caps || 0,
                activeBonuses: 0,
                activePenalties: 0,
                currentStreak: profile.current_streak || 0,
                gameHistory: profile.gameSequences?.map((reg: any) => ({
                  sequence: reg.sequence,
                  status: reg.status,
                  unpaid: false
                })) || [],
                latestSequence: profile.latestSequence || 0, // Pass latest sequence to XPBreakdown
                xp: profile.xp || 0,
                reserveXP: profile.reserveXP || 0,
                reserveCount: profile.reserve_games || 0,
                benchWarmerStreak: profile.bench_warmer_streak || 0,
                registrationStreak: profile.registrationStreak || 0,
                registrationStreakApplies: profile.registrationStreakApplies || false,
                unpaidGames: profile.unpaidGames || 0
              }} />
            </motion.div>

            {/* Token Status Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-base-200 rounded-box p-6 shadow-lg"
            >
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Token Status</h2>
              {tokenStatus && (
                <TokenStatus 
                  status={tokenStatus.status}
                  lastUsedAt={tokenStatus.lastUsedAt}
                  createdAt={tokenStatus.createdAt}
                  isEligible={tokenStatus.isEligible}
                  recentGames={tokenStatus.recentGames}
                  hasPlayedInLastTenGames={tokenStatus.hasPlayedInLastTenGames}
                  hasRecentSelection={tokenStatus.hasRecentSelection}
                  hasOutstandingPayments={tokenStatus.hasOutstandingPayments}
                  outstandingPaymentsCount={tokenStatus.outstandingPaymentsCount}
                  whatsappGroupMember={tokenStatus.whatsappGroupMember}
                />
              )}
            </motion.div>

            {/* Payment History Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-base-200 rounded-box p-6 shadow-lg"
            >
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Payment History</h2>
              <PaymentHistory playerId={profile?.id} />
            </motion.div>
          </>
        ) : null}

        {isAvatarEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AvatarCreator
              playerId={profile?.id}
              onClose={() => setIsAvatarEditorOpen(false)}
              currentAvatar={profile?.avatar_svg}
              currentOptions={profile?.avatar_options}
              onSave={handleAvatarSave}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}