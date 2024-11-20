import React from 'react'
import { Link } from 'react-router-dom'

const TeamGenerationCard: React.FC = () => {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Team Generation</h2>
        <p>Generate and balance teams for upcoming games</p>
        <div className="card-actions justify-end">
          <Link to="/admin/teams" className="btn btn-primary">Generate Teams</Link>
        </div>
      </div>
    </div>
  )
}

export default TeamGenerationCard
