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
  attack_rating?: number
  defense_rating?: number
  game_iq_rating?: number
  is_test_user: boolean
  calculated_caps?: number
  manual_caps_override?: boolean
  whatsapp_group_member?: 'Yes' | 'No' | 'Proxy'
  whatsapp_mobile_number?: string
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
          ...(player.attack_rating ? { attack_rating: player.attack_rating } : {}),
          ...(player.defense_rating ? { defense_rating: player.defense_rating } : {}),
          ...(player.game_iq_rating ? { game_iq_rating: player.game_iq_rating } : {}),
          whatsapp_group_member: player.whatsapp_group_member || null,
          whatsapp_mobile_number: player.whatsapp_mobile_number || null
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
        <div className="form-control">
          <label className="label" htmlFor="friendly_name">
            <span className="label-text">Friendly Name</span>
          </label>
          <input
            type="text"
            id="friendly_name"
            name="friendly_name"
            value={player.friendly_name}
            onChange={handleChange}
            required
            className="input input-bordered w-full"
          />
        </div>
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Use Manual Caps Override</span>
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
        </div>
        {!useManualOverride && calculatedCaps !== null && (
          <div className="alert alert-info">
            <span>Calculated caps based on game history: {calculatedCaps}</span>
          </div>
        )}
        <div className="form-control">
          <label className="label" htmlFor="caps">
            <span className="label-text">Caps</span>
          </label>
          <input
            type="number"
            id="caps"
            name="caps"
            value={player.caps}
            onChange={handleChange}
            required
            disabled={!useManualOverride}
            className="input input-bordered w-full"
          />
        </div>
        <div className="form-control">
          <label className="label" htmlFor="xp">
            <span className="label-text">XP</span>
          </label>
          <input
            type="number"
            id="xp"
            name="xp"
            value={player.xp}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>
        <div className="form-control">
          <label className="label" htmlFor="attack_rating">
            <span className="label-text">Attack Rating</span>
          </label>
          <input
            type="number"
            id="attack_rating"
            name="attack_rating"
            value={player.attack_rating || ''}
            onChange={handleChange}
            min="1"
            max="10"
            className="input input-bordered w-full"
          />
        </div>
        <div className="form-control">
          <label className="label" htmlFor="defense_rating">
            <span className="label-text">Defense Rating</span>
          </label>
          <input
            type="number"
            id="defense_rating"
            name="defense_rating"
            value={player.defense_rating || ''}
            onChange={handleChange}
            min="1"
            max="10"
            className="input input-bordered w-full"
          />
        </div>
        <div className="form-control">
          <label className="label" htmlFor="game_iq_rating">
            <span className="label-text">Game IQ Rating</span>
          </label>
          <input
            type="number"
            id="game_iq_rating"
            name="game_iq_rating"
            value={player.game_iq_rating || ''}
            onChange={handleChange}
            min="1"
            max="10"
            className="input input-bordered w-full"
          />
        </div>
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Test User</span>
            <input
              type="checkbox"
              name="is_test_user"
              checked={player.is_test_user}
              onChange={(e) => setPlayer(prev => prev ? { ...prev, is_test_user: e.target.checked } : null)}
              className="checkbox checkbox-primary"
            />
          </label>
        </div>
        <div className="form-control">
          <label className="label" htmlFor="whatsapp_group_member">
            <span className="label-text">WhatsApp Group Member</span>
          </label>
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
            className="select select-bordered w-full"
          >
            <option value="">Select status</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Proxy">Proxy</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label" htmlFor="whatsapp_mobile_number">
            <span className="label-text">
              WhatsApp Mobile Number
              {player.whatsapp_group_member === 'Yes' && <span className="text-error ml-1">*</span>}
            </span>
            <span className="label-text-alt text-gray-500">Format: +447123456789</span>
          </label>
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
            className={`input input-bordered w-full ${phoneError ? 'input-error' : ''} ${
              player.whatsapp_group_member !== 'Yes' ? 'input-disabled bg-base-200' : ''
            }`}
            disabled={player.whatsapp_group_member !== 'Yes'}
            required={player.whatsapp_group_member === 'Yes'}
          />
          {phoneError && (
            <label className="label">
              <span className="label-text-alt text-error">{phoneError}</span>
            </label>
          )}
        </div>
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