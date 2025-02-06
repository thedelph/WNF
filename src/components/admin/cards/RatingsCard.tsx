import React from 'react'
import { Link } from 'react-router-dom'
import { FaStar } from 'react-icons/fa'

const RatingsCard: React.FC = () => {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">
          <FaStar className="text-yellow-500" />
          Player Ratings
        </h2>
        <p className="text-base-content/70">
          View and manage confidential player ratings and statistics.
        </p>
        <div className="card-actions justify-end mt-4">
          <Link
            to="/admin/ratings"
            className="btn btn-primary"
          >
            View Ratings
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RatingsCard
