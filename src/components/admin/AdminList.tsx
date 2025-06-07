import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-toastify'

interface AdminListProps {
  admins: any[]
  onUpdate: () => void
}

const AdminList: React.FC<AdminListProps> = ({ admins, onUpdate }) => {
  const handleRemoveAdmin = async (adminId: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({ is_admin: false })
        .eq('id', adminId)

      if (error) throw error

      toast.success('Admin removed successfully')
      onUpdate()
    } catch (error) {
      toast.error('Failed to remove admin')
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {admins.map((admin) => (
          <motion.div
            key={admin.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="card bg-base-100 shadow-xl"
          >
            <div className="card-body">
              <h2 className="card-title">{admin.friendly_name}</h2>
              <p className="text-sm opacity-70">
                {admin.is_super_admin ? 'Super Admin' : 'Admin'}
              </p>
              {!admin.is_super_admin && (
                <div className="card-actions justify-end mt-4">
                  <button
                    onClick={() => handleRemoveAdmin(admin.id)}
                    className="btn btn-error btn-sm"
                  >
                    Remove Admin
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default AdminList
