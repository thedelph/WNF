import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAdmin } from '../../hooks/useAdmin'
import { motion } from 'framer-motion'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-toastify'
import NotificationBell from '../notifications/NotificationBell'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdmin, isSuperAdmin, loading } = useAdmin()

  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
      navigate('/')
    } catch (error) {
      toast.error('Failed to log out')
    }
  }

  return (
    <header className="navbar bg-base-100 shadow-lg">
      <div className="container mx-auto">
        <div className="flex-1">
          <Link to="/" className="text-xl font-bold">WNF</Link>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal px-1 items-center">
            <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Link to="/games">Games</Link>
            </motion.li>
            <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Link to="/players">Players</Link>
            </motion.li>
            {user && (
              <>
                <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
                  <Link to="/ratings">Ratings</Link>
                </motion.li>
                <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
                  <Link to="/profile">Profile</Link>
                </motion.li>
                {(isAdmin || isSuperAdmin) && !loading && (
                  <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
                    <Link to="/admin" className="btn btn-primary btn-sm">
                      Admin Portal
                    </Link>
                  </motion.li>
                )}
                <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
                  <NotificationBell />
                </motion.li>
                <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
                  <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                    Logout
                  </button>
                </motion.li>
              </>
            )}
            {!user && (
              <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Login
                </Link>
              </motion.li>
            )}
          </ul>
        </div>
      </div>
    </header>
  )
}

export default Header
