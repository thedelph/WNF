import React from 'react'
import { Link } from 'react-router-dom'
import { FaFlag } from 'react-icons/fa'

const FeatureFlagManagementCard: React.FC = () => {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">
          <FaFlag className="text-primary" />
          Feature Flags
        </h2>
        <p>Control feature rollouts and experiments</p>
        <div className="card-actions justify-end">
          <Link to="/admin/feature-flags" className="btn btn-primary">Manage Flags</Link>
        </div>
      </div>
    </div>
  )
}

export default FeatureFlagManagementCard