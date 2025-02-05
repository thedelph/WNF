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
  rarity?: number;
  active_bonuses?: number;
  active_penalties?: number;
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
            active_bonuses,
            active_penalties,
            current_streak,
            max_streak,
            avatar_svg,
            avatar_options
          `)
          .eq('user_id', user!.id)
          .single();

        if (playerError) throw playerError;
        if (!playerData) throw new Error('Player not found');

        // Get token status
        const { data: tokenData, error: tokenError } = await supabase
          .from('player_tokens')
          .select('*')
          .eq('player_id', playerData.id)
          .single();

        console.log('Token debug:', {
          playerId: playerData.id,
          tokenData,
          tokenError
        });

        if (tokenError && tokenError.code !== 'PGRST116') throw tokenError;

        // Then get the XP breakdown using the friendly_name
        const { data: xpData, error: profileError } = await supabase
          .from('player_xp_breakdown')
          .select(`
            friendly_name,
            current_stored_xp,
            base_xp,
            reserve_xp,
            reserve_games,
            subtotal_before_modifiers,
            attendance_streak,
            attendance_streak_modifier,
            reserve_game_modifier,
            registration_streak,
            registration_streak_modifier,
            unpaid_games_count,
            unpaid_games_modifier,
            total_xp
          `)
          .eq('friendly_name', playerData.friendly_name)
          .single();

        if (profileError) throw profileError;
        if (!xpData) throw new Error('Player not found');

        // Combine all data
        const combinedProfile: ExtendedPlayerData = {
          ...playerData,
          ...xpData,
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
          }
        };

        // Get all players' XP for rarity calculation
        const { data: allXPData, error: xpError } = await supabase
          .from('player_xp_breakdown')
          .select('total_xp');

        if (xpError) throw xpError;

        const allXP = allXPData.map(p => p.total_xp || 0);
        const rarity = calculateRarity(combinedProfile.total_xp, allXP);

        // Get game sequences for the player
        const { data: gameData, error: gameError } = await supabase
          .from('game_registrations')
          .select(`
            game_id,
            games!inner (
              sequence_number,
              is_historical
            ),
            status,
            team
          `)
          .eq('player_id', combinedProfile.id)
          .order('game_id', { ascending: false });

        if (gameError) throw gameError;

        const sequences = gameData?.map(reg => ({
          sequence: reg.games?.sequence_number || 0,
          status: reg.status,
          team: reg.team
        })).filter(seq => seq.sequence > 0) || [];

        setProfile({
          ...combinedProfile,
          rarity,
          gameSequences: sequences,
          xp: combinedProfile.total_xp,
          reserveXP: combinedProfile.reserve_xp
        });

        setGameSequences(sequences);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-error mb-4">Error</h1>
        <p className="text-gray-600">{error || 'Player not found'}</p>
      </div>
    )
  }

  const stats = [
    { 
      label: 'XP', 
      value: profile.xp.toLocaleString()
    },
    {
      label: 'Caps',
      value: profile.caps?.toLocaleString() || '0'
    },
    {
      label: 'Win Rate',
      value: `${profile.win_rate?.toLocaleString() || '0'}%`
    },
    {
      label: 'Active Bonuses',
      value: profile.active_bonuses ?? 'N/A'
    },
    {
      label: 'Active Penalties',
      value: profile.active_penalties ?? 'N/A'
    },
    {
      label: 'Current Streak',
      value: profile.current_streak?.toLocaleString() || '0'
    },
    {
      label: 'Longest Streak',
      value: profile.max_streak?.toLocaleString() || '0'
    }
  ]

  return (
    <div className="container mx-auto mt-4 sm:mt-8 p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-base-200 shadow-xl rounded-lg overflow-hidden"
      >
        <div className="p-4 sm:p-6 bg-primary text-primary-content">
          <h2 className="text-2xl sm:text-3xl font-bold">My Player Profile</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-4 sm:space-y-8"
              >
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Personal Information</h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-1">
                          Friendly Name
                          <Tooltip content="This is the name that will show up on the team sheets">
                            <span className="cursor-help">ℹ️</span>
                          </Tooltip>
                        </span>
                      </label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={friendlyName} 
                          onChange={(e) => setFriendlyName(e.target.value)} 
                          className="input input-bordered w-full"
                          placeholder="Enter your friendly name"
                        />
                      ) : (
                        <p className="text-base sm:text-lg">{profile.friendly_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text font-medium">Email</span>
                      </label>
                      <p className="text-base sm:text-lg break-all">{user.email}</p>
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text font-medium">Avatar</span>
                      </label>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <img 
                            src={profile.avatar_svg || '/src/assets/default-avatar.svg'} 
                            alt="Avatar" 
                            className="w-16 sm:w-20 h-16 sm:h-20 rounded-full cursor-pointer"
                            onClick={() => setIsAvatarEditorOpen(true)}
                          />
                        </motion.div>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsAvatarEditorOpen(true)} 
                          className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4">🎨</span>
                          <span className="font-medium">EDIT AVATAR</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 sm:mb-8"
                >
                  <XPBreakdown 
                    stats={{
                      caps: profile.caps || 0,
                      activeBonuses: profile.active_bonuses || 0,
                      activePenalties: profile.active_penalties || 0,
                      currentStreak: profile.current_streak || 0,
                      gameHistory: profile.gameSequences.map(sequence => ({
                        sequence: sequence.sequence,
                        status: sequence.status
                      })),
                      latestSequence: latestSequence,
                      xp: profile.xp || 0,
                      reserveXP: profile.reserveXP || 0,
                      benchWarmerStreak: profile.bench_warmer_streak || 0,
                      registrationStreak: profile.registration_streak || 0,
                      registrationStreakApplies: profile.registration_streak_applies || false,
                      unpaidGames: profile.unpaid_games || 0
                    }}
                  />
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="bg-base-100 rounded-lg p-3 sm:p-4 shadow-lg">
                      <h2 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">{stat.label}</h2>
                      <p className="text-base sm:text-xl">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="space-y-4 sm:space-y-8"
              >
                {profile && <StatsGrid profile={profile} />}
                {profile && (
                  <TokenStatus 
                    status={profile.token?.status || 'NO_TOKEN'}
                    lastUsedAt={profile.token?.last_used_at}
                    nextTokenAt={profile.token?.next_token_at}
                    createdAt={profile.token?.created_at || new Date().toISOString()}
                  />
                )}
                <PaymentHistory />
              </motion.div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-4 sm:mt-8 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4"
          >
            {isEditing ? (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSaveProfile} 
                  className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <span className="inline-flex items-center justify-center w-4 h-4">💾</span>
                  <span className="font-medium">SAVE PROFILE</span>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(false)} 
                  className="btn bg-base-200 hover:bg-base-300 text-base-content h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <span className="inline-flex items-center justify-center w-4 h-4">✖️</span>
                  <span className="font-medium">CANCEL</span>
                </motion.button>
              </div>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEditProfile} 
                className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <span className="inline-flex items-center justify-center w-4 h-4">✏️</span>
                <span className="font-medium">EDIT PROFILE</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </motion.div>

      {isAvatarEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-base-100 rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <AvatarCreator
              onSave={handleAvatarSave}
              onClose={() => setIsAvatarEditorOpen(false)}
              initialOptions={profile.avatar_options}
            />
          </motion.div>
        </div>
      )}
    </div>
  )
}