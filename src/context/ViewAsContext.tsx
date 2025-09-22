import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Permission } from '../types/permissions'

interface ViewAsUser {
  id: string
  user_id: string
  friendly_name: string
  is_admin: boolean
  is_super_admin: boolean
  is_beta_tester: boolean
  permissions: Permission[]
  roleName?: string
}

interface ViewAsContextValue {
  viewAsUser: ViewAsUser | null
  isViewingAs: boolean
  setViewAsUser: (user: ViewAsUser | null) => void
  clearViewAs: () => void
  // Legacy support - will be removed later
  viewAsAdmin: ViewAsUser | null
  setViewAsAdmin: (admin: ViewAsUser | null) => void
}

const ViewAsContext = createContext<ViewAsContextValue | null>(null)

export const useViewAs = () => {
  const context = useContext(ViewAsContext)
  if (!context) {
    throw new Error('useViewAs must be used within ViewAsProvider')
  }
  return context
}

interface ViewAsProviderProps {
  children: ReactNode
}

export const ViewAsProvider: React.FC<ViewAsProviderProps> = ({ children }) => {
  const [viewAsUser, setViewAsUser] = useState<ViewAsUser | null>(null)

  const clearViewAs = () => {
    setViewAsUser(null)
  }

  const value: ViewAsContextValue = {
    viewAsUser,
    isViewingAs: viewAsUser !== null,
    setViewAsUser,
    clearViewAs,
    // Legacy support - maps to new names
    viewAsAdmin: viewAsUser,
    setViewAsAdmin: setViewAsUser
  }

  return (
    <ViewAsContext.Provider value={value}>
      {children}
    </ViewAsContext.Provider>
  )
}