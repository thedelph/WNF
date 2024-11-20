import React from 'react'
import { motion } from 'framer-motion'
import PermissionToggle from './PermissionToggle'

interface AdminPermission {
  permission: string
  enabled: boolean
}

interface AdminPermissionsCardProps {
  adminId: string
  adminName: string
  permissions: AdminPermission[]
  onPermissionToggle: (permission: string, enabled: boolean) => void
}

const AdminPermissionsCard: React.FC<AdminPermissionsCardProps> = ({
  adminId,
  adminName,
  permissions,
  onPermissionToggle
}) => {
  return (
    <motion.div 
      className="card bg-base-100 shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="card-body">
        <h2 className="card-title">{adminName}</h2>
        <div className="space-y-2">
          {permissions.map((perm) => (
            <PermissionToggle
              key={perm.permission}
              label={perm.permission.replace('_', ' ').toUpperCase()}
              isEnabled={perm.enabled}
              onChange={(enabled) => onPermissionToggle(perm.permission, enabled)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default AdminPermissionsCard
