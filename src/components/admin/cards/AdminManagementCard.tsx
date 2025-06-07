import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const AdminManagementCard: React.FC = () => {
  return (
    <motion.div
      className="card bg-base-100 shadow-xl"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="card-body">
        <h2 className="card-title">Admin Management</h2>
        <p>Manage admin users and their permissions</p>
        <div className="card-actions justify-end">
          <Link to="/admin/admins" className="btn btn-primary">
            Manage Admins
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export default AdminManagementCard
