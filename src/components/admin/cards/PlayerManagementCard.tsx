import React from 'react'
import { Link } from 'react-router-dom'

const PlayerManagementCard: React.FC = () => {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Player Management</h2>
        <p>Manage player profiles, bonuses, and penalties</p>
        <div className="card-actions justify-end">
          <Link to="/admin/players" className="btn btn-primary">Manage Players</Link>
        </div>
      </div>
    </div>
  )
}

export default PlayerManagementCard
