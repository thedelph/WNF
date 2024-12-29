import React, { useState, useRef, useEffect } from 'react'
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
      navigate('/')
      setIsMenuOpen(false)
    } catch (error) {
      toast.error('Failed to log out')
    }
  }

  const NavLinks = () => (
    <>
      <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
        <Link to="/games" onClick={() => setIsMenuOpen(false)}>Games</Link>
      </motion.li>
      <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
        <Link to="/players" onClick={() => setIsMenuOpen(false)}>Players</Link>
      </motion.li>
      {user && (
        <>
          <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Link to="/ratings" onClick={() => setIsMenuOpen(false)}>Ratings</Link>
          </motion.li>
          <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Link to="/profile" onClick={() => setIsMenuOpen(false)}>Profile</Link>
          </motion.li>
          {!loading && (isAdmin || isSuperAdmin) && (
            <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Link to="/admin" onClick={() => setIsMenuOpen(false)}>Admin</Link>
            </motion.li>
          )}
          <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
            <button onClick={handleLogout}>Logout</button>
          </motion.li>
        </>
      )}
      {!user && (
        <motion.li variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Link to="/login" onClick={() => setIsMenuOpen(false)}>Login</Link>
        </motion.li>
      )}
    </>
  )

  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex-1">
          <Link to="/" className="flex items-center" onClick={() => setIsMenuOpen(false)}>
            <img src="/assets/wnf.webp" alt="WNF Logo" className="h-8 w-auto" />
          </Link>
        </div>
        <div className="flex-none hidden lg:block">
          <ul className="menu menu-horizontal px-1 items-center">
            <NavLinks />
          </ul>
        </div>
        <div className="flex-none lg:hidden relative" ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="btn btn-square btn-ghost"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 p-2 shadow-lg bg-base-100 rounded-box z-50">
              <ul className="menu menu-vertical">
                {user && (
                  <li className="mb-2 flex justify-end">
                    <div className="scale-90">
                      <NotificationBell />
                    </div>
                  </li>
                )}
                <NavLinks />
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Header
