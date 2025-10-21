import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-hot-toast'

interface WhatsAppSettingsProps {
  playerId: string
  currentNumber?: string | null
  whatsappGroupMember?: string | null  // 'Yes', 'No', 'Proxy', or null
  onUpdate?: () => void
}

export default function WhatsAppSettings({
  playerId,
  currentNumber,
  whatsappGroupMember,
  onUpdate
}: WhatsAppSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(currentNumber || '')
  const [groupMember, setGroupMember] = useState<'Yes' | 'No' | 'Proxy' | ''>(
    (whatsappGroupMember as 'Yes' | 'No' | 'Proxy') || ''
  )
  const [isLoading, setIsLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  const validatePhoneNumber = (number: string): boolean => {
    if (!number) return true // Allow empty (optional field)
    // E.164 format validation: +[country code][number]
    return /^\+[1-9]\d{1,14}$/.test(number)
  }

  const handleSave = async () => {
    // Validate
    if (groupMember === 'Yes' && !phoneNumber) {
      setPhoneError('Phone number is required when you are a WhatsApp group member')
      toast.error('Please provide a WhatsApp number')
      return
    }

    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      setPhoneError('Please enter a valid phone number in international format (e.g., +447123456789)')
      toast.error('Invalid phone number format')
      return
    }

    setIsLoading(true)
    setPhoneError('')

    try {
      const { error } = await supabase
        .from('players')
        .update({
          whatsapp_mobile_number: phoneNumber || null,
          whatsapp_group_member: groupMember || null
        })
        .eq('id', playerId)

      if (error) throw error

      toast.success('WhatsApp settings updated!')
      setIsEditing(false)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error updating WhatsApp settings:', error)
      toast.error('Failed to update settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setPhoneNumber(currentNumber || '')
    setGroupMember((whatsappGroupMember as 'Yes' | 'No' | 'Proxy') || '')
    setIsEditing(false)
    setPhoneError('')
  }

  return (
    <div className="space-y-4">
      {/* Header with status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">📱</span>
          <div>
            <h3 className="font-semibold text-lg">WhatsApp Integration</h3>
            <p className="text-sm text-base-content/70">
              Link your WhatsApp for easy game registration via reactions
            </p>
          </div>
        </div>
        {currentNumber && (
          <div className="badge badge-success gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Linked
          </div>
        )}
      </div>

      {/* Display or edit mode */}
      {!isEditing ? (
        /* Display Mode */
        <div className="bg-base-300 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-base-content/70">Phone Number</p>
              <p className="font-semibold">
                {currentNumber || <span className="text-base-content/50">Not set</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-base-content/70">Group Member Status</p>
              <p className="font-semibold">
                {groupMember === 'Yes' ?
                  <span className="text-success">✓ Yes</span> :
                  groupMember === 'Proxy' ?
                    <span className="text-warning">⚠ Proxy</span> :
                    <span className="text-base-content/50">No</span>
                }
              </p>
            </div>
          </div>

          <div className="divider my-2"></div>

          <div className="alert alert-info text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p className="font-semibold">Why link WhatsApp?</p>
              <ul className="list-disc list-inside mt-1 text-xs opacity-90">
                <li>Register for games with a 👍 reaction</li>
                <li>Check stats with commands like /xp, /stats</li>
                <li>Use priority tokens via WhatsApp</li>
                <li>Receive automated game announcements</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-primary btn-block"
          >
            {currentNumber ? 'Update WhatsApp Settings' : 'Link WhatsApp Number'}
          </button>
        </div>
      ) : (
        /* Edit Mode */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-base-300 rounded-lg p-4 space-y-4"
        >
          {/* Group Member Status */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Are you in the WhatsApp group?</span>
            </label>
            <select
              value={groupMember}
              onChange={(e) => {
                const value = e.target.value as 'Yes' | 'No' | 'Proxy' | ''
                setGroupMember(value)
                if (value !== 'Yes') {
                  setPhoneNumber('')
                  setPhoneError('')
                }
              }}
              className="select select-bordered w-full"
            >
              <option value="">Select status</option>
              <option value="Yes">Yes - I'm in the group</option>
              <option value="No">No - Not in the group</option>
              <option value="Proxy">Proxy - Someone else registers for me</option>
            </select>
          </div>

          {/* Phone Number Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                WhatsApp Mobile Number
                {groupMember === 'Yes' && <span className="text-error ml-1">*</span>}
              </span>
              <span className="label-text-alt text-base-content/70">
                Format: +447123456789
              </span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneError('')
                const value = e.target.value.replace(/[^\d+\s]/g, '')
                setPhoneNumber(value)
                if (value && !validatePhoneNumber(value)) {
                  setPhoneError('Please enter a valid phone number in international format')
                }
              }}
              pattern="^\+[1-9]\d{1,14}$"
              placeholder="+447123456789"
              className={`input input-bordered w-full ${phoneError ? 'input-error' : ''} ${
                groupMember !== 'Yes' ? 'input-disabled' : ''
              }`}
              disabled={groupMember !== 'Yes'}
              required={groupMember === 'Yes'}
            />
            {phoneError && (
              <label className="label">
                <span className="label-text-alt text-error">{phoneError}</span>
              </label>
            )}
            {!phoneError && groupMember === 'Yes' && (
              <label className="label">
                <span className="label-text-alt text-info">
                  Include country code (e.g., +44 for UK, +1 for US)
                </span>
              </label>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isLoading || !!phoneError}
              className="btn btn-primary flex-1"
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Help Link */}
      <div className="text-center">
        <a
          href="/help/whatsapp-bot"
          className="link link-primary text-sm"
        >
          Learn more about the WhatsApp bot →
        </a>
      </div>
    </div>
  )
}
