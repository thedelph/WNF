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
        console.log('🔄 Fetching profile data...')
        
        // Fetch player data and game registrations in parallel
        const [profileResponse, gameRegsResponse] = await Promise.all([
          supabase
            .from('players')
            .select('*')
            .eq('user_id', user!.id)
            .single(),
          supabase
            .from('game_registrations')
            .select(`
              player_id,
              team,
              games (
                outcome
              )
            `)
        ]);

        if (profileResponse.error) {
          console.error('❌ Profile fetch error:', profileResponse.error)
          throw profileResponse.error
        }

        if (gameRegsResponse.error) {
          console.error('❌ Game registrations fetch error:', gameRegsResponse.error)
          throw gameRegsResponse.error
        }

        const profileData = profileResponse.data;
        const gameRegs = gameRegsResponse.data;

        // Calculate win rate
        let wins = 0;
        let totalGames = 0;
        gameRegs.forEach(reg => {
          if (!reg.games?.outcome || reg.player_id !== profileData.id) return;
          
          const team = reg.team?.toLowerCase();
          const isWin = (team === 'blue' && reg.games.outcome === 'blue_win') ||
                       (team === 'orange' && reg.games.outcome === 'orange_win');
          
          if (isWin) wins++;
          totalGames++;
        });

        const winRate = totalGames > 0 
          ? Number((wins / totalGames * 100).toFixed(1))
          : 0;

        // Update profile data with calculated win rate
        const profileWithWinRate = {
          ...profileData,
          win_rate: winRate
        };

        console.log('✅ Full profile data:', profileWithWinRate)
        setProfile(profileWithWinRate)
      } catch (error) {
        console.error('❌ Error in profile fetch:', error)
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
      console.error('Error updating profile:', error)
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
      console.error('Error updating avatar:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!profile) {
    return <div>Error loading profile</div>
  }

  return (
    <div className="container mx-auto mt-8 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-base-200 shadow-xl rounded-lg overflow-hidden"
      >
        <div className="p-6 bg-primary text-primary-content">
          <h2 className="text-3xl font-bold">Player Profile</h2>
        </div>
        <div className="p-6">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Profile</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
                  <div className="space-y-4">
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
                        <p className="text-lg">{profile.friendly_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text font-medium">Email</span>
                      </label>
                      <p className="text-lg">{user.email}</p>
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text font-medium">Avatar</span>
                      </label>
                      <div className="flex items-center space-x-4">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <img 
                            src={profile.avatar_svg || '/src/assets/default-avatar.svg'} 
                            alt="Avatar" 
                            className="w-20 h-20 rounded-full cursor-pointer"
                            onClick={() => setIsAvatarEditorOpen(true)}
                          />
                        </motion.div>
                        <button 
                          onClick={() => setIsAvatarEditorOpen(true)} 
                          className="btn btn-primary"
                        >
                          Edit Avatar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="stats shadow">
                  <div className="stat">
                    <div className="stat-title">XP</div>
                    <div className="stat-value text-primary">{profile.xp}</div>
                    <XPBreakdown stats={{
                      caps: profile.caps,
                      activeBonuses: profile.active_bonuses,
                      activePenalties: profile.active_penalties,
                      currentStreak: profile.current_streak,
                      gameSequences: profile.game_sequences
                    }} />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { 
                        label: 'Caps', 
                        value: profile.caps 
                      },
                      { label: 'Win Rate', value: `${profile.win_rate}%` },
                      { label: 'Active Bonuses', value: profile.active_bonuses },
                      { label: 'Active Penalties', value: profile.active_penalties },
                      { label: 'Current Streak', value: profile.current_streak },
                      { label: 'Longest Streak', value: profile.max_streak },
                    ].map((stat, index) => (
                      <div key={index} className="bg-base-100 p-4 rounded-lg shadow">
                        <h4 className="font-medium text-sm text-gray-500">{stat.label}</h4>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="space-y-8"
              >
                <PaymentHistory />
              </motion.div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-8 flex justify-end"
          >
            {isEditing ? (
              <div className="space-x-4">
                <button 
                  onClick={handleSaveProfile} 
                  className="btn btn-primary"
                >
                  Save Profile
                </button>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button 
                onClick={handleEditProfile} 
                className="btn btn-primary"
              >
                Edit Profile
              </button>
            )}
          </motion.div>
        </div>
      </motion.div>
      {isAvatarEditorOpen && (
        <AvatarCreator
          onSave={handleAvatarSave}
          onCancel={() => setIsAvatarEditorOpen(false)}
          initialOptions={profile.avatar_options}
        />
      )}
    </div>
  )
}