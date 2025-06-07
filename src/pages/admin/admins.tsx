import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAdmin } from '../../hooks/useAdmin'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-toastify'
import { motion } from 'framer-motion'
import FormContainer from '../../components/common/containers/FormContainer'
import AdminList from '../../components/admin/AdminList'
import AdminForm from '../../components/admin/AdminForm'
import { SlotOffersCard } from '../../components/admin/cards/SlotOffersCard'

const AdminManagement: React.FC = () => {
  const { user } = useAuth()
  const { isSuperAdmin, loading: adminLoading } = useAdmin()
  const [admins, setAdmins] = useState<any[]>([])
  const [isAddingAdmin, setIsAddingAdmin] = useState(false)

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins()
    }
  }, [isSuperAdmin])

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('players')
      .select(`
        id,
        user_id,
        friendly_name,
        is_admin,
        is_super_admin,
        admin_permissions (
          permission
        )
      `)
      .order('friendly_name')

    if (error) {
      toast.error('Failed to fetch admins')
      return
    }

    setAdmins(data || [])
  }

  if (adminLoading) {
    return <div className="text-center mt-8">Loading...</div>
  }

  if (!isSuperAdmin) {
    return <div className="text-center mt-8">Access denied. Super admin only.</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto mt-8 p-4"
    >
      <FormContainer title="Admin Management">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AdminManagementCard />
            <PlayerManagementCard />
            <GameManagementCard />
            <SlotOffersCard />
            <TeamGenerationCard />
            <RatingsCard />
            <PaymentManagementCard />
            <HistoricalDataCard />
          </div>
          {!isAddingAdmin ? (
            <button
              onClick={() => setIsAddingAdmin(true)}
              className="btn btn-primary mb-6"
            >
              Add New Admin
            </button>
          ) : (
            <AdminForm
              onSubmit={async (playerId) => {
                await fetchAdmins()
                setIsAddingAdmin(false)
              }}
              onCancel={() => setIsAddingAdmin(false)}
            />
          )}
          <AdminList
            admins={admins}
            onUpdate={fetchAdmins}
          />
        </motion.div>
      </FormContainer>
    </motion.div>
  )
}

export default AdminManagement
