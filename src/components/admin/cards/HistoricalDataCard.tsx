import React from 'react'
import { Link } from 'react-router-dom'

const HistoricalDataCard: React.FC = () => {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Historical Data</h2>
        <p>Import and manage historical game data</p>
        <div className="card-actions justify-end">
          <Link to="/admin/history" className="btn btn-primary">Manage History</Link>
        </div>
      </div>
    </div>
  )
}

export default HistoricalDataCard
