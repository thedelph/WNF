'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'

import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import AvatarCreator from '../components/AvatarCreator'
import { calculatePlayerXP } from '../utils/xpCalculations'
import PaymentHistory from '../components/profile/PaymentHistory'
import XPBreakdown from '../components/profile/XPBreakdown'

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
  game_sequences: number[]
  latest_sequence: number
}

export default function Component() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [friendlyName, setFriendlyName] = useState('')
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // First get the player profile
        const profileResponse = await supabase
          .from('players')
          .select('*')
          .eq('user_id', user!.id)
          .single();

        if (profileResponse.error) throw profileResponse.error;
        const profileData = profileResponse.data;
        
        // Then get game registrations and latest sequence in parallel
        const [gameRegsResponse, latestSequenceResponse] = await Promise.all([
          supabase
            .from('game_registrations')
            .select(`
              player_id,
              team,
              games!inner (
                outcome,
                sequence_number
              )
            `)
            .eq('player_id', profileData.id)
            .order('games(sequence_number)', { ascending: false }),
          supabase
            .from('games')
            .select('sequence_number')
            .order('sequence_number', { ascending: false })
            .limit(1)
        ]);

        if (gameRegsResponse.error) throw gameRegsResponse.error;
        if (latestSequenceResponse.error) throw latestSequenceResponse.error;

        const gameRegs = gameRegsResponse.data;
        const latestSequence = Number(latestSequenceResponse.data[0]?.sequence_number || 0);

        // Get game sequences for the player
        const gameSequences = gameRegs
          .filter(reg => reg.games?.sequence_number != null)
          .map(reg => Number(reg.games.sequence_number))
          .filter(seq => !isNaN(seq))
          .sort((a, b) => b - a); // Sort in descending order

        // Calculate win rate
        let wins = 0;
        let totalGames = 0;
        gameRegs.forEach(reg => {
          if (!reg.games?.outcome) return;
          
          const team = reg.team?.toLowerCase();
          const isWin = (team === 'blue' && reg.games.outcome === 'blue_win') ||
                       (team === 'orange' && reg.games.outcome === 'orange_win');
          
          if (isWin) wins++;
          totalGames++;
        });

        const winRate = totalGames > 0 
          ? Number((wins / totalGames * 100).toFixed(1))
          : 0;

        // Update profile data with calculated win rate and game sequences
        const profileWithData = {
          ...profileData,
          win_rate: winRate,
          game_sequences: gameSequences,
          latest_sequence: latestSequence
        };

        setProfile(profileWithData);
      } catch (error) {
        setLoading(false)
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchProfile()
      const interval = setInterval(fetchProfile, 5000)
      return () => clearInterval(interval)
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
    return <div>Loading...</div>
  }

  if (!profile) {
    return <div>Error loading profile</div>
  }

  const stats = [
    { 
      label: 'XP', 
      value: (() => {
        try {
          const xpValue = calculatePlayerXP({
            caps: profile.caps ?? 0,
            activeBonuses: profile.active_bonuses ?? 0,
            activePenalties: profile.active_penalties ?? 0,
            currentStreak: profile.current_streak ?? 0,
            gameSequences: profile.game_sequences || [],
            latestSequence: profile.latest_sequence || 0
          });
          return xpValue.toLocaleString();
        } catch (error) {
          return '0';
        }
      })()
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
                        <span className="label-text font-medium">Friendly Name</span>
                        <span className="label-text-alt" title="This is the name that will show up on the team sheets.">ℹ️</span>
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
                        <button 
                          onClick={() => setIsAvatarEditorOpen(true)} 
                          className="btn btn-primary w-full sm:w-auto"
                        >
                          Edit Avatar
                        </button>
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
                      gameSequences: profile.game_sequences,
                      latestSequence: profile.latest_sequence
                    }} 
                    showTotal={false}
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
                <button 
                  onClick={handleSaveProfile} 
                  className="btn btn-primary w-full sm:w-auto"
                >
                  Save Profile
                </button>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="btn btn-ghost w-full sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button 
                onClick={handleEditProfile} 
                className="btn btn-primary w-full sm:w-auto"
              >
                Edit Profile
              </button>
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