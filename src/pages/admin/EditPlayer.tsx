import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '../../utils/supabase'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'

type Player = {
  id: string
  friendly_name: string
  caps: number
  xp: number
  // Peer-calculated averages (read-only, computed from player_ratings)
  average_attack_rating?: number
  average_defense_rating?: number
  average_game_iq_rating?: number
  average_gk_rating?: number
  is_test_user: boolean
  is_beta_tester: boolean
  calculated_caps?: number
  manual_caps_override?: boolean
  whatsapp_group_member?: 'Yes' | 'No' | 'Proxy'
  whatsapp_mobile_number?: string
  shield_tokens_available?: number
  games_played_since_shield_launch?: number
  shield_active?: boolean
  protected_streak_value?: number
  protected_streak_base?: number
}

const EditPlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculatedCaps, setCalculatedCaps] = useState<number | null>(null)
  const [useManualOverride, setUseManualOverride] = useState(false)
  const [phoneError, setPhoneError] = useState<string>('')

  const fetchCalculatedCaps = useCallback(async () => {
    if (!id) return

    const { data, error } = await supabaseAdmin
      .rpc('calculate_player_caps', { player_id: id })

    if (error) {
      console.error('Error calculating caps:', error)
      toast.error('Failed to calculate caps')
    } else {
      setCalculatedCaps(data)
    }
  }, [id])

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!id) {
        toast.error('No player ID provided')
        navigate('/admin/players')
        return
      }

      const { data, error } = await supabaseAdmin
        .from('players')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching player:', error)
        toast.error('Failed to fetch player data')
        navigate('/admin/players')
      } else if (data) {
        setPlayer(data as Player)
      } else {
        toast.error('Player not found')
        navigate('/admin/players')
      }
      await fetchCalculatedCaps()
      setLoading(false)
    }

    fetchPlayer()
  }, [id, navigate, fetchCalculatedCaps])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPlayer((prev) => prev ? ({ ...prev, [name]: value }) : null)
  }

  const validatePhoneNumber = (number: string): boolean => {
    // Allow empty string as the field is optional
    if (!number) return true
    // E.164 format validation
    return /^\+[1-9]\d{1,14}$/.test(number)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!player) return

    // Validate WhatsApp fields
    if (player.whatsapp_group_member === 'Yes' && !player.whatsapp_mobile_number) {
      setPhoneError('Phone number is required when WhatsApp Group Member is set to Yes')
      toast.error('Please provide a WhatsApp number')
      return
    }

    // Validate phone number format if provided
    if (player.whatsapp_mobile_number && !validatePhoneNumber(player.whatsapp_mobile_number)) {
      setPhoneError('Please enter a valid phone number in international format (e.g., +447123456789)')
      toast.error('Please fix the phone number format')
      return
    }

    try {
      const { error } = await supabaseAdmin
        .from('players')
        .update({
          friendly_name: player.friendly_name,
          ...(player.xp !== undefined ? { xp: player.xp } : {}),
          caps: useManualOverride ? player.caps : calculatedCaps,
          is_test_user: player.is_test_user,
          manual_caps_override: useManualOverride,
          // Note: Rating fields (average_attack_rating, etc.) are NOT updated here
          // They are peer-calculated averages from the player_ratings table
          whatsapp_group_member: player.whatsapp_group_member || null,
          whatsapp_mobile_number: player.whatsapp_mobile_number || null,
          shield_tokens_available: player.shield_tokens_available || 0,
          games_played_since_shield_launch: player.games_played_since_shield_launch || 0
        })
        .eq('id', id)

      if (error) throw error

      toast.success('Player updated successfully!')
      navigate('/admin/players')
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update player')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="text-center mt-8">
        <h2 className="text-2xl font-bold text-error">Player not found</h2>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="container mx-auto mt-8 p-4"
    >
      <h1 className="text-3xl font-bold mb-6">Edit Player</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Friendly Name</legend>
          <input
            type="text"
            id="friendly_name"
            name="friendly_name"
            value={player.friendly_name}
            onChange={handleChange}
            required
            className="input w-full"
          />
        </fieldset>
        <fieldset className="fieldset">
          <label className="label cursor-pointer">
            <legend className="fieldset-legend">Use Manual Caps Override</legend>
            <input
              type="checkbox"
              checked={useManualOverride}
              onChange={(e) => {
                setUseManualOverride(e.target.checked)
                if (!e.target.checked && calculatedCaps !== null) {
                  setPlayer(prev => prev ? { ...prev, caps: calculatedCaps } : null)
                }
              }}
              className="checkbox checkbox-primary"
            />
          </label>
        </fieldset>
        {!useManualOverride && calculatedCaps !== null && (
          <div className="alert alert-info">
            <span>Calculated caps based on game history: {calculatedCaps}</span>
          </div>
        )}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Caps</legend>
          <input
            type="number"
            id="caps"
            name="caps"
            value={player.caps}
            onChange={handleChange}
            required
            disabled={!useManualOverride}
            className="input w-full"
          />
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">XP</legend>
          <input
            type="number"
            id="xp"
            name="xp"
            value={player.xp}
            onChange={handleChange}
            className="input w-full"
          />
        </fieldset>
        {/* Peer-Calculated Ratings (Read-Only) */}
        <div className="divider">Peer Ratings (Read-Only)</div>
        <div className="alert alert-info mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-sm">These ratings are calculated from peer reviews and cannot be edited directly.</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title text-xs">Attack</div>
            <div className="stat-value text-lg">{player.average_attack_rating?.toFixed(1) ?? 'N/A'}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title text-xs">Defense</div>
            <div className="stat-value text-lg">{player.average_defense_rating?.toFixed(1) ?? 'N/A'}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title text-xs">Game IQ</div>
            <div className="stat-value text-lg">{player.average_game_iq_rating?.toFixed(1) ?? 'N/A'}</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-4">
            <div className="stat-title text-xs">GK</div>
            <div className="stat-value text-lg">{player.average_gk_rating?.toFixed(1) ?? 'N/A'}</div>
          </div>
        </div>

        {/* Shield Token Section */}
        <div className="divider">Shield Tokens</div>

        <div className="alert alert-info mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-sm">Shield tokens protect player streaks when they can't play. View-only unless admin override needed.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Shield Tokens Available</legend>
            <input
              type="number"
              id="shield_tokens_available"
              name="shield_tokens_available"
              value={player.shield_tokens_available || 0}
              onChange={handleChange}
              min="0"
              max="4"
              className="input w-full"
            />
            <p className="fieldset-label">Max: 4</p>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Games Played (Shield System)</legend>
            <input
              type="number"
              id="games_played_since_shield_launch"
              name="games_played_since_shield_launch"
              value={player.games_played_since_shield_launch || 0}
              onChange={handleChange}
              min="0"
              className="input w-full"
            />
            <p className="fieldset-label">1 token per 10 games</p>
          </fieldset>
        </div>

        {player.shield_active && (
          <div className="alert alert-success mt-4">
            <span className="text-lg">🛡️</span>
            <div>
              <h3 className="font-bold">Active Shield Protection</h3>
              <div className="text-sm">
                Protected Streak: {player.protected_streak_value} games (gradual decay active)
              </div>
            </div>
          </div>
        )}

        <fieldset className="fieldset">
          <label className="label cursor-pointer">
            <legend className="fieldset-legend">Test User</legend>
            <input
              type="checkbox"
              name="is_test_user"
              checked={player.is_test_user}
              onChange={(e) => setPlayer(prev => prev ? { ...prev, is_test_user: e.target.checked } : null)}
              className="checkbox checkbox-primary"
            />
          </label>
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">WhatsApp Group Member</legend>
          <select
            id="whatsapp_group_member"
            name="whatsapp_group_member"
            value={player.whatsapp_group_member || ''}
            onChange={(e) => {
              handleChange(e);
              // Clear phone number and error when switching to No or Proxy
              if (e.target.value !== 'Yes') {
                setPlayer(prev => prev ? { ...prev, whatsapp_mobile_number: '' } : null);
                setPhoneError('');
              }
            }}
            className="select w-full"
          >
            <option value="">Select status</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Proxy">Proxy</option>
          </select>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">
            WhatsApp Mobile Number
            {player.whatsapp_group_member === 'Yes' && <span className="text-error ml-1">*</span>}
          </legend>
          <input
            type="tel"
            id="whatsapp_mobile_number"
            name="whatsapp_mobile_number"
            value={player.whatsapp_mobile_number || ''}
            onChange={(e) => {
              setPhoneError('')
              const value = e.target.value.replace(/[^\d+\s]/g, '');
              setPlayer(prev => prev ? { ...prev, whatsapp_mobile_number: value } : null);
              if (value && !validatePhoneNumber(value)) {
                setPhoneError('Please enter a valid phone number in international format')
              }
            }}
            pattern="^\+[1-9]\d{1,14}$"
            placeholder="+447123456789"
            className={`input w-full ${phoneError ? 'input-error' : ''} ${
              player.whatsapp_group_member !== 'Yes' ? 'input-disabled bg-base-200' : ''
            }`}
            disabled={player.whatsapp_group_member !== 'Yes'}
            required={player.whatsapp_group_member === 'Yes'}
          />
          <p className="fieldset-label text-gray-500 dark:text-gray-400">Format: +447123456789</p>
          {phoneError && (
            <p className="fieldset-label text-error">{phoneError}</p>
          )}
        </fieldset>
        <div className="flex justify-between mt-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="btn btn-primary"
          >
            Save Changes
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => navigate('/admin/players')}
            className="btn btn-ghost"
          >
            Cancel
          </motion.button>
        </div>
      </form>
    </motion.div>
  )
}

export default EditPlayer