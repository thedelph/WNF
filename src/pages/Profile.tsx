'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import AvatarCreator from '../components/AvatarCreator'
import ProfileHeader from '../components/profile/ProfileHeader'
import ProfileContent from '../components/profile/ProfileContent'
import EditNameModal from '../components/profile/EditNameModal'
import PasswordChangeSection from '../components/profile/PasswordChangeSection'
import { useTokenStatus } from '../hooks/useTokenStatus'
import { formatDate, executeWithRetry, calculateRarity } from '../utils/profileHelpers'
import { ExtendedPlayerData } from '../types/profile'
import { Tooltip } from '../components/ui/Tooltip'
import { findClosestPlaystyle } from '../utils/playstyleUtils'
import { PREDEFINED_PLAYSTYLES } from '../data/playstyles'

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
  const [showPasswordReset, setShowPasswordReset] = useState(false)
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
              bench_warmer_streak,
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
          // Fetch player_xp data with rank information
          const xpResult = await executeWithRetry(
            () => supabase
              .from('player_xp')
              .select('*, rank')
              .eq('player_id', playerData.id)
              .single()
          );

          if (xpResult.error) {
            console.error('Error fetching XP data:', xpResult.error);
            toast.error('Failed to load XP data');
          } else {
            xpData = xpResult.data;
            console.log('Player XP data with rank:', xpData);
          }
        } catch (xpError) {
          console.error('Error processing XP data:', xpError);
          toast.error('Failed to process XP data');
        }

        // Fetch registration streak data
        let registrationStreakData = null;
        try {
          const { data: streakData, error: streakError } = await executeWithRetry(
            () => supabase
              .from('player_current_registration_streak_bonus')
              .select('current_streak_length, bonus_applies')
              .eq('friendly_name', playerData.friendly_name)
              .maybeSingle()
          );
          
          console.log('[Profile] Registration streak query result:', {
            friendly_name: playerData.friendly_name,
            data: streakData,
            error: streakError
          });
          
          if (!streakError && streakData) {
            registrationStreakData = streakData;
          } else if (streakError) {
            console.error('Error fetching registration streak:', streakError);
          }
        } catch (regStreakError) {
          console.error('Error fetching registration streak:', regStreakError);
          // Continue without registration streak data
        }


        // Get count of unpaid games
        let unpaidGamesCount = 0;
        try {
          const { data: unpaidData, error: unpaidError } = await executeWithRetry(
            () => supabase
              .from('player_unpaid_games_view')
              .select('count')
              .eq('player_id', playerData.id)
              .single()
          );

          if (!unpaidError && unpaidData) {
            unpaidGamesCount = unpaidData.count || 0;
          }
        } catch (unpaidCountError) {
          console.error('Error fetching unpaid games count:', unpaidCountError);
          // Continue without unpaid games count
        }

        // Fetch player averaged attributes for playstyle
        let playstyleData = null;
        let playstyleMatch = null;
        try {
          const { data: derivedAttrsData, error: derivedAttrsError } = await executeWithRetry(
            () => supabase
              .from('player_derived_attributes')
              .select(`
                pace_rating,
                shooting_rating,
                passing_rating,
                dribbling_rating,
                defending_rating,
                physical_rating,
                total_ratings_count
              `)
              .eq('player_id', playerData.id)
              .maybeSingle()
          );

          if (!derivedAttrsError && derivedAttrsData) {
            playstyleData = derivedAttrsData;
            // Calculate closest playstyle match
            playstyleMatch = findClosestPlaystyle(derivedAttrsData, PREDEFINED_PLAYSTYLES);
            console.log('Player playstyle match:', playstyleMatch);
          } else if (derivedAttrsError) {
            console.error('Error fetching playstyle data:', derivedAttrsError);
          }
        } catch (playstyleError) {
          console.error('Error processing playstyle data:', playstyleError);
          // Continue without playstyle data
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
          reserve_games: xpData?.reserve_games || 0, // Add reserve_games from player_xp_breakdown
          // Use the rank from xpData if available, otherwise try to get it from playerData.player_xp
          rank: xpData?.rank || (playerData.player_xp && playerData.player_xp[0] ? playerData.player_xp[0].rank : 7),
          rarity: xpData?.rarity || (playerData.player_xp && playerData.player_xp[0] ? playerData.player_xp[0].rarity : 'Amateur'),
          current_streak: playerData.current_streak || 0,
          max_streak: correctMaxStreak,
          maxStreakDate: maxStreakDate || undefined,
          whatsapp_group_member: playerData.whatsapp_group_member || false,
          win_rate: winRate,
          recent_win_rate: recentWinRate,
          highestXP: highestXPData?.xp,
          highestXPSnapshotDate: highestXPData?.snapshot_date ? formatDate(highestXPData.snapshot_date) : undefined,
          caps: playerData.caps || 0,
          bench_warmer_streak: playerData.bench_warmer_streak || 0,
          registrationStreak: registrationStreakData?.current_streak_length || 0,
          registrationStreakApplies: registrationStreakData?.bonus_applies || false,
          unpaidGames: unpaidGamesCount,
          averagedPlaystyle: playstyleMatch?.playstyleName,
          playstyleMatchDistance: playstyleMatch?.matchDistance,
          playstyleCategory: playstyleMatch?.category,
          playstyleRatingsCount: playstyleData?.total_ratings_count || 0
        };

        // Add debug logs to track XP data
        console.log('Player XP data:', {
          playerXP: playerData.player_xp && playerData.player_xp[0] ? playerData.player_xp[0].xp : 'No player_xp data',
          xpDataTotal: xpData?.xp || 'No total_xp in xpData',
          finalXP: profileData.xp,
          finalTotalXP: profileData.total_xp,
          registrationStreak: profileData.registrationStreak,
          registrationStreakApplies: profileData.registrationStreakApplies,
          registrationStreakData
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
            gameSequences: registrations?.map((reg: any) => {
              // Check if games object exists before accessing properties
              if (!reg.games) {
                console.warn('Registration missing game data:', reg);
                return null;
              }

              return {
                sequence: reg.games.sequence_number,
                status: reg.status,
                is_historical: reg.games.is_historical
              };
            }).filter(Boolean) || [], // Filter out null values
            latestSequence: latestSequence, // Add latest sequence to profile data
            // Preserve playstyle fields
            averagedPlaystyle: profileData.averagedPlaystyle,
            playstyleMatchDistance: profileData.playstyleMatchDistance,
            playstyleCategory: profileData.playstyleCategory,
            playstyleRatingsCount: profileData.playstyleRatingsCount
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
    if (user) {
      loadProfile()
    }
  }, [user])

  const handleEditProfile = () => setIsEditing(true)

  const handleSaveProfile = async (newName: string) => {
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
        .update({ friendly_name: newName })
        .eq('user_id', user!.id)

      if (error) throw error

      setProfile((prevProfile) => ({
        ...prevProfile!,
        friendly_name: newName,
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100">
      <motion.div 
        className="container mx-auto px-4 py-8 max-w-6xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {profile ? (
          <>
            {/* Profile Header with Avatar and Name */}
            <ProfileHeader
              profile={profile}
              onEditClick={handleEditProfile}
              onAvatarEditClick={() => setIsAvatarEditorOpen(true)}
              onPasswordResetClick={() => setShowPasswordReset(true)}
            />

            {/* Password Reset Section (shown when requested) */}
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ 
                height: showPasswordReset ? 'auto' : 0,
                opacity: showPasswordReset ? 1 : 0
              }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 30,
                opacity: { duration: 0.2 }
              }}
              className="overflow-visible mb-6 px-1 pt-1"
            >
              <AnimatePresence mode="wait">
                {showPasswordReset && (
                  <motion.div
                    key="password-change-section"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PasswordChangeSection 
                      onClose={() => setShowPasswordReset(false)} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid gap-6">
              <ProfileContent
                profile={profile}
                tokenStatus={tokenStatus}
              />
            </div>
          </>
        ) : null}

        {/* Edit Name Modal */}
        {isEditing && profile && (
          <EditNameModal
            currentName={profile.friendly_name}
            onSave={handleSaveProfile}
            onClose={() => setIsEditing(false)}
          />
        )}

        {/* Avatar Editor */}
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