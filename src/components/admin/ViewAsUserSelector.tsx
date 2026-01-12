import React, { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Permission } from '../../types/permissions'

interface User {
  id: string
  user_id: string
  friendly_name: string
  is_admin: boolean
  is_super_admin: boolean
  is_beta_tester: boolean
  caps: number
  win_rate: number
  admin_role?: {
    role?: {
      name: string
      role_permissions: { permission: Permission }[]
    }
    admin_permissions: { permission: Permission }[]
  }
}

interface ViewAsUserSelectorProps {
  onSelectUser: (user: User) => void
  onCancel: () => void
}

const ViewAsUserSelector: React.FC<ViewAsUserSelectorProps> = ({ onSelectUser, onCancel }) => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'admins' | 'beta' | 'regular'>('all')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          user_id,
          friendly_name,
          is_admin,
          is_super_admin,
          is_beta_tester,
          caps,
          win_rate,
          admin_roles!left (
            id,
            role:roles!left (
              name,
              role_permissions!left (
                permission
              )
            ),
            admin_permissions!left (
              permission
            )
          )
        `)
        .order('friendly_name')

      if (error) throw error

      // Transform the data to match our interface
      const transformedUsers = data?.map(player => ({
        ...player,
        admin_role: player.admin_roles?.[0]
      })) || []

      setUsers(transformedUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.friendly_name.toLowerCase().includes(searchQuery.toLowerCase())

    switch (filterType) {
      case 'admins':
        return matchesSearch && (user.is_admin || user.is_super_admin)
      case 'beta':
        return matchesSearch && user.is_beta_tester
      case 'regular':
        return matchesSearch && !user.is_admin && !user.is_super_admin && !user.is_beta_tester
      default:
        return matchesSearch
    }
  })

  const getUserBadges = (user: User) => {
    const badges = []

    if (user.is_super_admin) {
      badges.push(<span key="super" className="badge badge-error badge-sm">Super Admin</span>)
    } else if (user.is_admin) {
      if (user.admin_role?.role?.name) {
        badges.push(<span key="role" className="badge badge-primary badge-sm">{user.admin_role.role.name}</span>)
      } else {
        badges.push(<span key="admin" className="badge badge-primary badge-sm">Full Admin</span>)
      }
    }

    if (user.is_beta_tester) {
      badges.push(<span key="beta" className="badge badge-secondary badge-sm">Beta Tester</span>)
    }

    return badges
  }

  const getUserGroup = (user: User) => {
    if (user.is_super_admin) return 'Super Admins'
    if (user.is_admin) return 'Admins'
    if (user.is_beta_tester) return 'Beta Testers'
    return 'Regular Players'
  }

  const groupedUsers = filteredUsers.reduce((acc, user) => {
    const group = getUserGroup(user)
    if (!acc[group]) acc[group] = []
    acc[group].push(user)
    return acc
  }, {} as Record<string, User[]>)

  const handleSelectUser = () => {
    if (selectedUser) {
      onSelectUser(selectedUser)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-bold text-lg mb-4">View As User</h3>
        <p className="text-sm text-base-content/70 mb-6">
          Select any user to view the application with their permissions and feature access.
          This allows you to test what any user would see, including feature flags and beta features.
        </p>

        {/* Search and Filter Controls */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search users..."
            className="input flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">All Users</option>
            <option value="admins">Admins Only</option>
            <option value="beta">Beta Testers</option>
            <option value="regular">Regular Players</option>
          </select>
        </div>

        {/* User List */}
        <div className="max-h-96 overflow-y-auto border rounded-lg p-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <>
              {Object.entries(groupedUsers).map(([group, groupUsers]) => (
                <div key={group} className="mb-4">
                  <h4 className="text-sm font-semibold text-base-content/60 px-2 py-1">
                    {group} ({groupUsers.length})
                  </h4>
                  {groupUsers.map(user => (
                    <motion.div
                      key={user.id}
                      whileHover={{ scale: 1.01 }}
                      className={`p-3 rounded-lg cursor-pointer mb-1 ${
                        selectedUser?.id === user.id
                          ? 'bg-primary/20 border-2 border-primary'
                          : 'bg-base-200 hover:bg-base-300 border-2 border-transparent'
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">{user.friendly_name}</div>
                            <div className="text-xs text-base-content/60">
                              {user.caps} caps • {(user.win_rate * 100).toFixed(0)}% win rate
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {getUserBadges(user)}
                        </div>
                      </div>

                      {/* Show permissions for admins */}
                      {(user.is_admin || user.is_super_admin) && selectedUser?.id === user.id && (
                        <div className="mt-2 pt-2 border-t border-base-300">
                          <div className="text-xs text-base-content/60">
                            {user.is_super_admin ? (
                              <span>Has all permissions</span>
                            ) : (
                              <div>
                                <span className="font-semibold">Permissions: </span>
                                {user.admin_role?.role?.role_permissions?.length ? (
                                  user.admin_role.role.role_permissions
                                    .map(p => p.permission)
                                    .join(', ')
                                ) : (
                                  'All non-super permissions'
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Selected User Info */}
        {selectedUser && (
          <div className="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="font-medium">Selected: {selectedUser.friendly_name}</span>
              <div className="text-xs mt-1">
                You will see the application exactly as this user would see it, including their permissions and feature access.
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSelectUser}
            disabled={!selectedUser}
          >
            View As Selected User
          </button>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ViewAsUserSelector