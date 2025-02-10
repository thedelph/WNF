'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Tooltip } from '../components/ui/Tooltip'
import AvatarCreator from '../components/AvatarCreator'
import PaymentHistory from '../components/profile/PaymentHistory'
import XPBreakdown from '../components/profile/XPBreakdown'
import StatsGrid from '../components/profile/StatsGrid'
import TokenStatus from '../components/profile/TokenStatus'
import { executeWithRetry, executeBatchQueries } from '../utils/network'
import { useTokenStatus } from '../hooks/useTokenStatus'

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

interface ExtendedPlayerData extends PlayerProfile {
  xp: number
  reserveXP: number
  gameSequences?: Array<{
    sequence: number;
    status: string;
    team: string;
  }>;
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [friendlyName, setFriendlyName] = useState('')
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false)
  const [gameSequences, setGameSequences] = useState<any[]>([])
  const [latestSequence, setLatestSequence] = useState<number>(0)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const { tokenStatus } = useTokenStatus(playerId || '')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get player data first
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
          toast.error('Failed to load player data');
          return;
        }

        if (!playerData) {
          toast.error('Player not found');
          return;
        }

        // Store player ID for token status hook
        setPlayerId(playerData.id);

        // Get XP breakdown from player_xp table
        const { data: xpData, error: xpError } = await executeWithRetry(
          () => supabase
            .from('player_xp')
            .select('*')
            .eq('player_id', playerData.id)
            .single()
        );

        if (xpError) {
          console.error('Error fetching XP data:', xpError);
          toast.error('Failed to load XP data');
          return;
        }

        // Combine the data
        const profileData: ExtendedPlayerData = {
          friendly_name: playerData.friendly_name,
          current_stored_xp: xpData?.current_stored_xp || 0,
          base_xp: xpData?.base_xp || 0,
          reserve_xp: xpData?.reserve_xp || 0,
          reserve_games: xpData?.reserve_games || 0,
          subtotal_before_modifiers: xpData?.subtotal_before_modifiers || 0,
          attendance_streak: xpData?.attendance_streak || 0,
          attendance_streak_modifier: xpData?.attendance_streak_modifier || 0,
          reserve_game_modifier: xpData?.reserve_game_modifier || 0,
          registration_streak: xpData?.registration_streak || 0,
          registration_streak_modifier: xpData?.registration_streak_modifier || 0,
          unpaid_games_count: xpData?.unpaid_games_count || 0,
          unpaid_games_modifier: xpData?.unpaid_games_modifier || 0,
          total_xp: playerData.player_xp?.xp || 0,
          rarity: playerData.player_xp?.rarity || 'Amateur',
          current_streak: playerData.current_streak || 0,
          max_streak: playerData.max_streak || 0,
          avatar_svg: playerData.avatar_svg,
          avatar_options: playerData.avatar_options,
          xp: playerData.player_xp?.xp || 0,
          reserveXP: xpData?.reserve_xp || 0
        };

        setProfile(profileData);
        setFriendlyName(profileData.friendly_name || '');

        // Now that we have the player data, get the latest sequence number
        const { data: latestSeqData, error: latestSeqError } = await executeWithRetry(
          () => supabase
            .from('games')
            .select('sequence_number')
            .eq('completed', true)
            .order('sequence_number', { ascending: false })
            .limit(1)
            .single()
        );

        if (latestSeqError) {
          console.error('Error fetching latest sequence:', latestSeqError);
        }

        setLatestSequence(latestSeqData?.sequence_number || 0);

        // Get all registrations for historical games with retry
        const { data: registrations, error: registrationsError } = await executeWithRetry(
          () => supabase
            .from('game_registrations')
            .select(`
              status,
              games!inner (
                sequence_number,
                is_historical
              )
            `)
            .eq('player_id', playerData.id),
          { shouldToast: false }
        );

        if (registrationsError) {
          console.error('Error fetching registrations:', registrationsError);
        }

        // Combine all the data
        const updatedProfileData: ExtendedPlayerData = {
          ...profileData,
          gameSequences: registrations?.map(reg => ({
            sequence: reg.games.sequence_number,
            status: reg.status,
            is_historical: reg.games.is_historical
          })) || []
        };

        setProfile(updatedProfileData);

      } catch (err: any) {
        console.error('Error in fetchProfile:', err);
        setError(err.message || 'Failed to load profile data');
        toast.error('Error loading profile data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  // Set up real-time subscription for profile updates
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_stats',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchProfile()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleEditProfile = () => setIsEditing(true)

  const handleSaveProfile = async () => {
    if (!friendlyName) {
      toast.error('Please fill in all fields.')
      return
    }

    const restrictedNames = ['admin', 'administrator']
    if (restrictedNames.includes(friendlyName.toLowerCase())) {
      toast.error('Friendly name cannot be "admin" or "administrator".')
      return
    }

    try {
      const { error } = await supabase
        .from('players')
        .update({ friendly_name: friendlyName })
        .eq('user_id', user!.id)

      if (error) throw error

      setProfile((prevProfile) => ({
        ...prevProfile!,
        friendly_name: friendlyName,
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

        {loading ? (
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
                        value={friendlyName} 
                        onChange={(e) => setFriendlyName(e.target.value)} 
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
              <StatsGrid profile={{
                total_xp: profile.xp,
                current_streak: profile.current_streak || 0,
                max_streak: profile.max_streak || 0,
                rarity: profile.rarity
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
                gameHistory: profile.gameSequences?.map(seq => ({
                  sequence: seq.sequence,
                  status: seq.status,
                  unpaid: false
                })) || [],
                latestSequence: latestSequence,
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
                  nextTokenAt={tokenStatus.nextTokenAt}
                  createdAt={tokenStatus.createdAt}
                  isEligible={tokenStatus.isEligible}
                  recentGames={tokenStatus.recentGames}
                  hasPlayedInLastTenGames={tokenStatus.hasPlayedInLastTenGames}
                  hasRecentSelection={tokenStatus.hasRecentSelection}
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
              <PaymentHistory playerId={profile.id} />
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
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}