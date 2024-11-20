import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const GameManagementCard: React.FC = () => {
  return (
    <motion.div 
      className="card bg-base-100 shadow-xl"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="card-body">
        <h2 className="card-title">Game Management</h2>
        <p>Create and manage games, handle venues and scheduling</p>
        <div className="card-actions justify-end">
          <Link to="/admin/games" className="btn btn-primary">Manage Games</Link>
        </div>
      </div>
    </motion.div>
  )
}

export default GameManagementCard
