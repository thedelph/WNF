import React from 'react'
import { Link } from 'react-router-dom'

const RoleManagementCard: React.FC = () => {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Role Management</h2>
        <p>Create and manage admin roles and permissions</p>
        <div className="card-actions justify-end">
          <Link to="/admin/roles" className="btn btn-primary">Manage Roles</Link>
        </div>
      </div>
    </div>
  )
}

export default RoleManagementCard