import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Permission } from '../types/permissions'

interface ViewAsAdmin {
  id: string
  friendly_name: string
  is_admin: boolean
  is_super_admin: boolean
  permissions: Permission[]
  roleName?: string
}

interface ViewAsContextValue {
  viewAsAdmin: ViewAsAdmin | null
  isViewingAs: boolean
  setViewAsAdmin: (admin: ViewAsAdmin | null) => void
  clearViewAs: () => void
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
  const [viewAsAdmin, setViewAsAdmin] = useState<ViewAsAdmin | null>(null)

  const clearViewAs = () => {
    setViewAsAdmin(null)
  }

  const value: ViewAsContextValue = {
    viewAsAdmin,
    isViewingAs: viewAsAdmin !== null,
    setViewAsAdmin,
    clearViewAs
  }

  return (
    <ViewAsContext.Provider value={value}>
      {children}
    </ViewAsContext.Provider>
  )
}