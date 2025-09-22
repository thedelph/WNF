import React from 'react'
import { useViewAs } from '../../context/ViewAsContext'
import { motion, AnimatePresence } from 'framer-motion'

const ViewAsIndicator: React.FC = () => {
  const { viewAsUser, isViewingAs, clearViewAs } = useViewAs()

  const handleExit = () => {
    clearViewAs()
    // Don't navigate - just clear the view and stay on current page
  }

  // Determine user type for display
  const getUserType = () => {
    if (!viewAsUser) return ''
    if (viewAsUser.is_super_admin) return 'Super Admin'
    if (viewAsUser.is_admin && viewAsUser.roleName) return viewAsUser.roleName
    if (viewAsUser.is_admin) return 'Full Admin'
    if (viewAsUser.is_beta_tester) return 'Beta Tester'
    return 'Regular User'
  }

  const getUserBadgeColor = () => {
    if (!viewAsUser) return ''
    if (viewAsUser.is_super_admin) return 'badge-error'
    if (viewAsUser.is_admin) return 'badge-primary'
    if (viewAsUser.is_beta_tester) return 'badge-secondary'
    return 'badge-neutral'
  }

  return (
    <AnimatePresence>
      {isViewingAs && viewAsUser && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-xl"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-bold text-lg">VIEW AS MODE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-90">Currently viewing as:</span>
                  <span className="font-bold text-lg">{viewAsUser.friendly_name}</span>
                  <span className={`badge ${getUserBadgeColor()} badge-sm`}>
                    {getUserType()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs opacity-90 hidden sm:block">
                  You're seeing exactly what this user sees
                </div>
                <button
                  onClick={handleExit}
                  className="btn btn-sm btn-error text-white hover:bg-red-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Exit View As Mode
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ViewAsIndicator