import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseAdmin } from '../../../utils/supabase'
import { toast } from 'react-hot-toast'

interface BulkCreateTestUsersModalProps {
  isOpen: boolean
  onClose: () => void
  onUsersCreated: () => void
}

const BulkCreateTestUsersModal: React.FC<BulkCreateTestUsersModalProps> = ({
  isOpen,
  onClose,
  onUsersCreated
}) => {
  const [count, setCount] = useState(5)

  const handleCreateTestUsers = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const testUsers = Array.from({ length: count }, (_, i) => ({
        friendly_name: `Test User ${i + 1}`,
        preferred_position: positions[Math.floor(Math.random() * positions.length)],
        is_test_user: true,
        caps: 0,
        xp: 0,
        win_rate: 0
      }))

      const { error } = await supabaseAdmin
        .from('players')
        .insert(testUsers)

      if (error) throw error
      
      toast.success(`${count} test users created successfully`)
      onUsersCreated()
      onClose()
    } catch (error) {
      console.error('Error creating test users:', error)
      toast.error('Failed to create test users')
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
            <h2 className="text-2xl font-bold mb-4">Bulk Create Test Users</h2>
            <form onSubmit={handleCreateTestUsers}>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Number of Users to Create</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  min="1"
                  max="50"
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
                  Create Users
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

export default BulkCreateTestUsersModal