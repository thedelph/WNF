import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FaStar } from 'react-icons/fa'

const RatingsCard: React.FC = () => {
  return (
    <motion.div
      className="card bg-base-100 shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
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
    </motion.div>
  )
}

export default RatingsCard
