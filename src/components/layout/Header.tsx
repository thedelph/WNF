import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAdmin } from '../../hooks/useAdmin'
import { supabase } from '../../utils/supabase'
import { toast } from 'react-toastify'
import NotificationBell from '../notifications/NotificationBell'
import ThemeToggle from '../ui/ThemeToggle'

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
      <li>
        <Link to="/games" onClick={() => setIsMenuOpen(false)} className="transition-colors duration-200">
          Games
        </Link>
      </li>
      <li>
        <Link to="/players" onClick={() => setIsMenuOpen(false)} className="transition-colors duration-200">
          Players
        </Link>
      </li>
      {user && (
        <>
          <li>
            <Link to="/ratings" onClick={() => setIsMenuOpen(false)} className="transition-colors duration-200">
              Ratings
            </Link>
          </li>
          <li>
            <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="transition-colors duration-200">
              Profile
            </Link>
          </li>
          {!loading && (isAdmin || isSuperAdmin) && (
            <li>
              <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="transition-colors duration-200">
                Admin
              </Link>
            </li>
          )}
          <li>
            <a onClick={handleLogout} className="transition-colors duration-200 cursor-pointer">
              Logout
            </a>
          </li>
        </>
      )}
      {!user && (
        <li>
          <Link to="/login" onClick={() => setIsMenuOpen(false)} className="transition-colors duration-200">
            Login
          </Link>
        </li>
      )}
    </>
  )

  return (
    <div className="navbar bg-base-100 shadow-lg px-4">
      {/* Logo - Left aligned */}
      <div className="navbar-start">
        <Link to="/" className="flex items-center" onClick={() => setIsMenuOpen(false)}>
          <img src="/assets/wnf-logo-removed-bg.png" alt="WNF Logo" className="h-12 w-auto" />
        </Link>
      </div>

      {/* Navigation - Right aligned */}
      <div className="navbar-end">
        {/* Desktop Navigation */}
        <ul className="menu menu-horizontal menu-sm px-1 items-center hidden lg:flex">
          <NavLinks />
          <li className="ml-2">
            <ThemeToggle />
          </li>
          {user && (
            <li>
              <NotificationBell />
            </li>
          )}
        </ul>

        {/* Mobile Menu Button */}
        <div className="lg:hidden relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="btn btn-square btn-ghost"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-7 h-7 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 p-2 shadow-lg bg-base-100 rounded-box z-50">
              <ul className="menu menu-vertical">
                <li className="mb-2 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    {user && <NotificationBell />}
                  </div>
                </li>
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
