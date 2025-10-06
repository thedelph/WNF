import React, { useState } from 'react'
import { supabaseAdmin } from '../../utils/supabase'
import { useAdmin } from '../../hooks/useAdmin'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, User, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

interface UserSessionInfo {
  id: string
  email: string
  friendly_name: string
  last_sign_in_at: string
  created_at: string
  app_metadata: any
  user_metadata: any
}

const SessionDiagnostics: React.FC = () => {
  const [searchEmail, setSearchEmail] = useState('')
  const [userInfo, setUserInfo] = useState<UserSessionInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendingMagicLink, setSendingMagicLink] = useState(false)
  const { isSuperAdmin } = useAdmin()

  // List of known problematic users (you can update this)
  const problemUsers = [
    'toffeetower@hotmail.com',
    // Add more problematic user emails here as needed
  ]

  const searchUser = async () => {
    if (!searchEmail) {
      toast.error('Please enter an email address')
      return
    }

    setLoading(true)
    try {
      // First, search for the user in auth system
      let authUser = null
      let player = null

      if (isSuperAdmin) {
        // Search in auth.users directly using SQL for better control
        const { data: authData, error: authError } = await supabaseAdmin
          .from('auth.users')
          .select('*')
          .eq('email', searchEmail.toLowerCase())
          .single()

        if (!authError && authData) {
          authUser = authData

          // Now try to find the player record using the auth user's ID
          const { data: playerData, error: playerError } = await supabaseAdmin
            .from('players')
            .select('*')
            .eq('user_id', authData.id)
            .single()

          if (!playerError && playerData) {
            player = playerData
          }
        }
      } else {
        // Non-super admins: try a different approach
        // We can't directly query auth.users, so we'll need to work differently
        toast.error('Non-super admins cannot search auth users directly')
        setUserInfo(null)
        return
      }

      // If we found both auth user and player
      if (authUser && player) {
        setUserInfo({
          id: authUser.id,
          email: authUser.email || '',
          friendly_name: player.friendly_name || '',
          last_sign_in_at: authUser.last_sign_in_at || '',
          created_at: authUser.created_at,
          app_metadata: authUser.app_metadata || {},
          user_metadata: authUser.user_metadata || {}
        })
        return
      }

      // If we found auth user but no player record
      if (authUser && !player) {
        toast.warning('User found in auth system but not in players table. This may indicate an incomplete registration.')
        setUserInfo({
          id: authUser.id,
          email: authUser.email || '',
          friendly_name: authUser.user_metadata?.friendly_name || 'Not set',
          last_sign_in_at: authUser.last_sign_in_at || '',
          created_at: authUser.created_at,
          app_metadata: authUser.app_metadata || {},
          user_metadata: authUser.user_metadata || {}
        })
        return
      }

      // If nothing found, continue with fallback search

      // If still not found, try pagination search as fallback
      if (!authUser && isSuperAdmin) {
        console.log('User not found in players table, searching in auth system...')

        try {
          // Use admin auth API to list users and search by email
          // Note: We need to paginate through all users as there might be more than 1000
          let allUsers: any[] = []
          let page = 1
          let hasMore = true

          while (hasMore && page <= 10) { // Limit to 10 pages (10,000 users) for safety
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
              page,
              perPage: 1000
            })

            if (listError) {
              console.error(`Error listing users on page ${page}:`, listError)
              break
            }

            if (users && users.length > 0) {
              allUsers = [...allUsers, ...users]
              console.log(`Fetched page ${page}, total users so far: ${allUsers.length}`)

              // Check if we found the user in this batch
              const authUser = users.find(u => u.email?.toLowerCase() === searchEmail.toLowerCase())
              if (authUser) {
                // Found user in auth but not in players table
                toast.warning('User found in auth system but not in players table. This may indicate an incomplete registration.')

                setUserInfo({
                  id: authUser.id,
                  email: authUser.email || searchEmail,
                  friendly_name: authUser.user_metadata?.friendly_name || 'Not set',
                  last_sign_in_at: authUser.last_sign_in_at || 'Never',
                  created_at: authUser.created_at,
                  app_metadata: authUser.app_metadata || {},
                  user_metadata: authUser.user_metadata || {}
                })
                return
              }

              if (users.length < 1000) {
                hasMore = false // Less than full page means we've reached the end
              } else {
                page++
              }
            } else {
              hasMore = false
            }
          }

          console.log(`Searched ${allUsers.length} total auth users, did not find ${searchEmail}`)

          // Also log some similar emails if any exist
          const similarEmails = allUsers
            .filter(u => u.email && u.email.toLowerCase().includes('toffee'))
            .map(u => u.email)

          if (similarEmails.length > 0) {
            console.log('Found similar emails:', similarEmails)
            toast('No exact match found. Check console for similar emails.', {
              icon: '🔍',
              duration: 5000
            })
          }
        } catch (authSearchError) {
          console.error('Error searching auth users:', authSearchError)
        }

        // If not found in either table, but user might still exist in auth
        // Set up minimal info to allow magic link sending
        toast('User not found. You can still try sending a magic link if they have an auth account.', {
          icon: '📧',
          duration: 5000
        })

        setUserInfo({
          id: 'unknown',
          email: searchEmail,
          friendly_name: 'Unknown User',
          last_sign_in_at: 'Unknown',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {}
        })
        return
      }
    } catch (error: any) {
      console.error('Search error:', error)
      toast.error('Error searching for user: ' + error.message)
      setUserInfo(null)
    } finally {
      setLoading(false)
    }
  }

  const sendMagicLink = async () => {
    if (!userInfo?.email) {
      toast.error('No user selected')
      return
    }

    setSendingMagicLink(true)
    try {
      // First try with shouldCreateUser: false (for existing users)
      const { error } = await supabaseAdmin.auth.signInWithOtp({
        email: userInfo.email,
        options: {
          shouldCreateUser: false
        }
      })

      if (error) {
        // If the user doesn't exist, try creating them
        if (error.message?.includes('User not found')) {
          console.log('User not found, trying to create user with magic link...')
          const { error: createError } = await supabaseAdmin.auth.signInWithOtp({
            email: userInfo.email,
            options: {
              shouldCreateUser: true
            }
          })

          if (createError) throw createError
          toast.success(`Magic link sent to ${userInfo.email} (new user created)`)
        } else {
          throw error
        }
      } else {
        toast.success(`Magic link sent to ${userInfo.email}`)
      }
    } catch (error: any) {
      toast.error('Failed to send magic link: ' + error.message)
    } finally {
      setSendingMagicLink(false)
    }
  }

  const resetUserPassword = async () => {
    if (!userInfo?.email) {
      toast.error('No user selected')
      return
    }

    if (!confirm(`Are you sure you want to send a password reset to ${userInfo.email}?`)) {
      return
    }

    try {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(userInfo.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      toast.success(`Password reset email sent to ${userInfo.email}`)
    } catch (error: any) {
      toast.error('Failed to send password reset: ' + error.message)
    }
  }

  const clearUserSessions = async () => {
    if (!userInfo?.id || !isSuperAdmin) {
      toast.error('Insufficient permissions')
      return
    }

    if (!confirm(`This will log out ${userInfo.email} from all devices. Continue?`)) {
      return
    }

    try {
      const { error } = await supabaseAdmin.auth.admin.signOut(userInfo.id, 'global')

      if (error) throw error

      toast.success(`All sessions cleared for ${userInfo.email}`)
    } catch (error: any) {
      toast.error('Failed to clear sessions: ' + error.message)
    }
  }

  const getSessionStatus = () => {
    if (!userInfo) return null

    const lastSignIn = userInfo.last_sign_in_at
    if (lastSignIn === 'Unable to retrieve' || lastSignIn === 'Restricted') {
      return { status: 'unknown', color: 'gray', message: lastSignIn }
    }

    const lastSignInDate = new Date(lastSignIn)
    const hoursSinceSignIn = (Date.now() - lastSignInDate.getTime()) / (1000 * 60 * 60)

    if (hoursSinceSignIn < 1) {
      return { status: 'active', color: 'green', message: 'Recently active' }
    } else if (hoursSinceSignIn < 24) {
      return { status: 'recent', color: 'blue', message: 'Active today' }
    } else if (hoursSinceSignIn < 168) {
      return { status: 'week', color: 'yellow', message: 'Active this week' }
    } else {
      return { status: 'inactive', color: 'red', message: 'Inactive' }
    }
  }

  const sessionStatus = getSessionStatus()

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Session Diagnostics</h1>

      {/* Search Section */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Search User</h2>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter user email..."
              className="input input-bordered flex-1"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUser()}
            />
            <button
              className="btn btn-primary"
              onClick={searchUser}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : 'Search'}
            </button>
          </div>

          {problemUsers.length > 0 && (
            <div className="mt-2">
              <span className="text-sm text-gray-500">Known issues with: </span>
              {problemUsers.map((email, i) => (
                <button
                  key={i}
                  className="btn btn-xs btn-ghost"
                  onClick={() => setSearchEmail(email)}
                >
                  {email}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Info Section */}
      {userInfo && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title">
                <User className="w-5 h-5" />
                {userInfo.friendly_name}
              </h2>
              {sessionStatus && (
                <div className={`badge badge-${sessionStatus.color} gap-2`}>
                  {sessionStatus.status === 'active' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : sessionStatus.status === 'inactive' ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {sessionStatus.message}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold">Email</p>
                <p className="text-sm flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {userInfo.email}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold">User ID</p>
                <p className="text-xs font-mono">{userInfo.id}</p>
              </div>

              <div>
                <p className="text-sm font-semibold">Last Sign In</p>
                <p className="text-sm">
                  {userInfo.last_sign_in_at !== 'Unable to retrieve' &&
                   userInfo.last_sign_in_at !== 'Restricted'
                    ? new Date(userInfo.last_sign_in_at).toLocaleString()
                    : userInfo.last_sign_in_at}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold">Account Created</p>
                <p className="text-sm">{new Date(userInfo.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Metadata (for super admins) */}
            {isSuperAdmin && Object.keys(userInfo.app_metadata).length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold">Metadata</summary>
                <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                  {JSON.stringify({ app_metadata: userInfo.app_metadata, user_metadata: userInfo.user_metadata }, null, 2)}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="card-actions justify-end mt-6">
              <button
                className="btn btn-sm btn-info"
                onClick={sendMagicLink}
                disabled={sendingMagicLink}
              >
                {sendingMagicLink ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Magic Link
                  </>
                )}
              </button>

              <button
                className="btn btn-sm btn-warning"
                onClick={resetUserPassword}
              >
                <RefreshCw className="w-4 h-4" />
                Reset Password
              </button>

              {isSuperAdmin && (
                <button
                  className="btn btn-sm btn-error"
                  onClick={clearUserSessions}
                >
                  <XCircle className="w-4 h-4" />
                  Clear All Sessions
                </button>
              )}
            </div>

            {/* Help Text */}
            <div className="alert alert-info mt-4">
              <AlertTriangle className="w-4 h-4" />
              <div className="text-xs">
                <p className="font-semibold">Troubleshooting Tips:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Magic links bypass password issues and create fresh sessions</li>
                  <li>Password resets clear any corrupted authentication data</li>
                  <li>Clearing sessions forces re-authentication on all devices</li>
                  <li>If issues persist after deployment, use magic link as temporary workaround</li>
                  <li>Users showing "Unknown User" may still receive magic links if they have auth accounts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionDiagnostics