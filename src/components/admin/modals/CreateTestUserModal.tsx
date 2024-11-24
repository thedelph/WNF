import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'

interface CreateTestUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserCreated: () => void
}

const CreateTestUserModal: React.FC<CreateTestUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated
}) => {
  const [formData, setFormData] = useState({
    friendly_name: '',
    preferred_position: '' as string,
    attack_rating: undefined as number | undefined,
    defense_rating: undefined as number | undefined,
    caps: 0
  })

  const handleCreateTestUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data, error } = await supabaseAdmin
        .from('players')
        .insert({
          friendly_name: formData.friendly_name,
          ...(formData.preferred_position ? { preferred_position: formData.preferred_position } : {}),
          is_test_user: true,
          caps: formData.caps,
          win_rate: 0,
          ...(formData.attack_rating ? { attack_rating: formData.attack_rating } : {}),
          ...(formData.defense_rating ? { defense_rating: formData.defense_rating } : {})
        })
        .select()

      if (error) throw error
      
      console.log('Created user:', data)
      toast.success('Test user created successfully')
      onUserCreated()
      onClose()
    } catch (error) {
      console.error('Error creating test user:', error)
      toast.error(`Failed to create test user: ${error.message}`)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-base-100 p-6 rounded-lg w-full max-w-md"
          >
            <h2 className="text-2xl font-bold mb-4">Create Test User</h2>
            <form onSubmit={handleCreateTestUser}>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Friendly Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.friendly_name}
                  onChange={(e) => setFormData({...formData, friendly_name: e.target.value})}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Preferred Position</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.preferred_position}
                  onChange={(e) => setFormData({...formData, preferred_position: e.target.value})}
                >
                  <option value="">Select position...</option>
                  {['GK', 'LB', 'CB', 'RB', 'RM', 'CM', 'LM', 'ST'].map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Attack Rating</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={formData.attack_rating}
                  onChange={(e) => setFormData({...formData, attack_rating: e.target.value ? parseInt(e.target.value) : undefined})}
                  min="1"
                  max="10"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Defense Rating</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={formData.defense_rating}
                  onChange={(e) => setFormData({...formData, defense_rating: e.target.value ? parseInt(e.target.value) : undefined})}
                  min="1"
                  max="10"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Initial Caps</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={formData.caps}
                  onChange={(e) => setFormData({...formData, caps: parseInt(e.target.value)})}
                  min="0"
                  required
                />
              </div>

              <div className="mt-6 flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary"
                  type="submit"
                >
                  Create
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-ghost"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CreateTestUserModal