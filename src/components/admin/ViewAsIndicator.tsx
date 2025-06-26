import React from 'react'
import { useViewAs } from '../../context/ViewAsContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const ViewAsIndicator: React.FC = () => {
  const { viewAsAdmin, isViewingAs, clearViewAs } = useViewAs()
  const navigate = useNavigate()

  const handleExit = () => {
    clearViewAs()
    navigate('/admin/admins')
  }

  return (
    <AnimatePresence>
      {isViewingAs && viewAsAdmin && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-50 bg-warning text-warning-content p-3 shadow-lg"
        >
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="font-medium">
                Viewing as: <strong>{viewAsAdmin.friendly_name}</strong>
                {viewAsAdmin.roleName && (
                  <span className="ml-2 badge badge-sm">
                    {viewAsAdmin.roleName}
                  </span>
                )}
              </span>
              {viewAsAdmin.is_super_admin && (
                <span className="badge badge-error badge-sm">Super Admin</span>
              )}
              {viewAsAdmin.is_admin && !viewAsAdmin.is_super_admin && !viewAsAdmin.roleName && (
                <span className="badge badge-primary badge-sm">Full Admin</span>
              )}
            </div>
            <button
              onClick={handleExit}
              className="btn btn-sm btn-ghost"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Exit View As
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ViewAsIndicator