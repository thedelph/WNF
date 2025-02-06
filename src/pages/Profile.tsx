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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        // First get the latest sequence number from completed games
        const { data: latestSeqData, error: latestSeqError } = await supabase
          .from('games')
          .select('sequence_number')
          .eq('completed', true)
          .order('sequence_number', { ascending: false })
          .limit(1)
          .single();

        if (latestSeqError) throw latestSeqError;
        setLatestSequence(latestSeqData?.sequence_number || 0);

        // First get the player data to get the friendly_name and UI fields
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select(`
            id,
            friendly_name,
            current_streak,
            max_streak,
            avatar_svg,
            avatar_options,
            player_xp (
              xp,
              rarity
            )
          `)
          .eq('user_id', user?.id)
          .single();

        if (playerError) throw playerError;

        // Get token status
        const { data: tokenData, error: tokenError } = await supabase
          .from('player_tokens')
          .select('*')
          .eq('player_id', playerData.id)
          .maybeSingle();

        if (tokenError && tokenError.code !== 'PGRST116') throw tokenError;

        // Get player's XP breakdown
        const { data: xpBreakdown, error: xpError } = await supabase
          .from('player_xp_breakdown')
          .select('*')
          .eq('friendly_name', playerData.friendly_name)
          .single();

        if (xpError) throw xpError;

        // Get all registrations for historical games
        const { data: registrations, error: registrationsError } = await supabase
          .from('game_registrations')
          .select(`
            status,
            games!inner (
              sequence_number,
              is_historical
            )
          `)
          .eq('player_id', playerData.id)
          .eq('games.is_historical', true);

        if (registrationsError) {
          throw registrationsError;
        }

        // Count reserve appearances
        const reserveCount = registrations?.filter(reg => reg.status === 'reserve').length || 0;
        // Each reserve appearance gives 5 XP
        const reserveXP = reserveCount * 5;

        // Get registration streak data
        const { data: regStreakData, error: regStreakError } = await supabase
          .from('player_current_registration_streak_bonus')
          .select('current_streak_length, bonus_applies')
          .eq('friendly_name', playerData.friendly_name)
          .maybeSingle();

        if (regStreakError) {
          throw regStreakError;
        }

        // Get count of unpaid games using the player_unpaid_games_view
        const { data: unpaidGamesData, error: unpaidError } = await supabase
          .from('player_unpaid_games_view')
          .select('unpaid_games_count')
          .eq('player_id', playerData.id)
          .maybeSingle();

        if (unpaidError) {
          throw unpaidError;
        }

        const unpaidGamesCount = unpaidGamesData?.unpaid_games_count || 0;

        // Get game sequences
        const { data: gameSeqData, error: gameSeqError } = await supabase
          .from('game_registrations')
          .select(`
            status,
            team,
            game:game_id(
              sequence_number
            )
          `)
          .eq('player_id', playerData.id)
          .eq('game.is_historical', true)
          .eq('game.completed', true)
          .order('game(sequence_number)', { ascending: false });

        if (gameSeqError) throw gameSeqError;

        const sequences = gameSeqData
          ?.filter(reg => reg.game !== null)
          .map(reg => ({
            sequence: reg.game.sequence_number,
            status: reg.status,
            team: reg.team
          })) || [];

        setGameSequences(sequences);

        // Combine all the data
        const combinedProfile: ExtendedPlayerData = {
          ...xpBreakdown,
          friendly_name: playerData.friendly_name,
          current_streak: playerData.current_streak || 0,
          max_streak: playerData.max_streak || 0,
          avatar_svg: playerData.avatar_svg,
          avatar_options: playerData.avatar_options,
          token: tokenData ? {
            status: tokenData.used_at ? 'USED' : tokenData.expires_at ? 'EXPIRED' : 'AVAILABLE',
            last_used_at: tokenData.used_at,
            next_token_at: tokenData.used_at ? new Date(tokenData.used_at).getTime() + (22 * 24 * 60 * 60 * 1000) : null,
            created_at: tokenData.issued_at
          } : {
            status: 'NO_TOKEN',
            last_used_at: null,
            next_token_at: null,
            created_at: new Date().toISOString()
          },
          xp: playerData.player_xp?.xp || 0,
          rarity: playerData.player_xp?.rarity || 'Amateur',
          reserveXP: reserveXP,
          gameSequences: sequences,
          registrationStreak: regStreakData?.current_streak_length || 0,
          registrationStreakApplies: regStreakData?.bonus_applies || false,
          unpaidGames: unpaidGamesCount
        };

        setProfile(combinedProfile);
        setFriendlyName(playerData.friendly_name);
      } catch (err) {
        console.error('Error fetching player data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred while fetching player data')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchProfile()
    }
  }, [user])

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
              <TokenStatus 
                status={profile.token?.status || 'NO_TOKEN'}
                lastUsedAt={profile.token?.last_used_at}
                nextTokenAt={profile.token?.next_token_at}
                createdAt={profile.token?.created_at}
              />
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