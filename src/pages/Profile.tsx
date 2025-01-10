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

interface PlayerProfile {
  id: string
  user_id: string
  friendly_name: string
  xp: number
  caps: number
  active_bonuses: number
  active_penalties: number
  win_rate: number
  current_streak: number
  max_streak: number
  avatar_svg: string | null
  avatar_options: any
}

interface ExtendedPlayerData extends PlayerProfile {
  rarity: number
  reserveXP: number
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

        // Get player stats from the updated player_stats view that includes XP
        const { data: profileData, error: profileError } = await supabase
          .from('player_stats')
          .select(`
            id,
            user_id,
            friendly_name,
            xp,
            caps,
            active_bonuses,
            active_penalties,
            current_streak,
            max_streak,
            avatar_svg,
            avatar_options,
            reserve_xp_transactions (
              xp_amount
            )
          `)
          .eq('user_id', user!.id)
          .single();

        if (profileError) throw profileError;
        if (!profileData) throw new Error('Player not found');

        // Get win rate data
        const { data: winRatesData, error: winRatesError } = await supabase
          .rpc('get_player_win_rates');

        if (winRatesError) throw winRatesError;

        const playerWinRate = winRatesData?.find(wr => wr.id === profileData.id)?.win_rate || 0;

        // Calculate total reserve XP
        const totalReserveXP = profileData.reserve_xp_transactions?.reduce((sum, tx) => sum + (tx.xp_amount || 0), 0) || 0;

        // Get game sequences for the player
        const { data: gameData, error: gameError } = await supabase
          .from('game_registrations')
          .select(`
            games (
              sequence_number,
              is_historical
            ),
            status
          `)
          .eq('player_id', profileData.id)
          .order('games(sequence_number)', { ascending: false });

        if (gameError) throw gameError;
        
        const sequences = gameData
          ?.filter(reg => reg.games?.is_historical)
          .map(reg => ({
            sequence: reg.games?.sequence_number,
            status: reg.status || 'selected'
          }))
          .filter(game => game.sequence !== undefined) || [];
        setGameSequences(sequences);

        // Calculate rarity based on all players' XP
        const { data: allXPData, error: xpError } = await supabase
          .from('player_stats')
          .select('xp')

        if (xpError) throw xpError

        const allXP = allXPData.map(p => p.xp || 0)
        const rarity = calculateRarity(profileData.xp, allXP)

        setProfile({
          ...profileData,
          win_rate: playerWinRate,
          rarity,
          reserveXP: totalReserveXP
        })
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

      toast.success('Profile updated successfully!')
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
                      gameHistory: gameSequences.map(sequence => ({
                        sequence: sequence.sequence,
                        status: sequence.status
                      })),
                      latestSequence: latestSequence,
                      xp: profile.xp || 0,
                      reserveXP: profile.reserveXP
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