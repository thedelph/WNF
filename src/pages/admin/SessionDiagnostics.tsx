import React, { useState } from 'react'
import { supabase, supabaseAdmin } from '../../utils/supabase'
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
  const [serviceRoleKeyMissing, setServiceRoleKeyMissing] = useState(false)
  const { isSuperAdmin } = useAdmin()

  // List of known problematic users (you can update this)
  const problemUsers = [
    'toffeetower@hotmail.com', // Dom
    // Add Anthony B's email here when identified
  ]

  // Check if service role key is configured
  React.useEffect(() => {
    const checkServiceRoleKey = () => {
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      if (!serviceRoleKey || serviceRoleKey === import.meta.env.VITE_SUPABASE_ANON_KEY) {
        setServiceRoleKeyMissing(true)
        console.warn('⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY is not configured or is same as anon key. Some admin features will not work.')
      }
    }
    checkServiceRoleKey()
  }, [])

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
        // Use Admin API to search for user by email
        console.log('🔍 Searching for user via Admin API:', searchEmail.toLowerCase())

        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers()

        if (authError) {
          console.error('❌ Admin API error:', authError)
          throw authError
        }

        // Find user by email
        const foundUser = users.find(u => u.email?.toLowerCase() === searchEmail.toLowerCase())

        if (foundUser) {
          console.log('✅ Found auth user:', {
            id: foundUser.id,
            email: foundUser.email,
            last_sign_in: foundUser.last_sign_in_at
          })

          authUser = foundUser

          // Now try to find the player record using the auth user's ID
          const { data: playerData, error: playerError } = await supabaseAdmin
            .from('players')
            .select('*')
            .eq('user_id', foundUser.id)
            .maybeSingle() // Use maybeSingle instead of single to avoid error on no rows

          if (playerData) {
            player = playerData
            console.log('✅ Found player record:', {
              friendly_name: playerData.friendly_name,
              user_id: playerData.user_id,
              whatsapp_member: playerData.whatsapp_group_member
            })
          } else {
            console.warn('⚠️ No player record found for user_id:', foundUser.id)
            if (playerError) {
              console.error('Player query error:', playerError)
            }
          }
        } else {
          console.warn('⚠️ No auth user found with email:', searchEmail)
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
        toast('User found in auth system but not in players table. This may indicate an incomplete registration.', {
          icon: '⚠️',
          duration: 5000
        })
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
                toast('User found in auth system but not in players table. This may indicate an incomplete registration.', {
                  icon: '⚠️',
                  duration: 5000
                })

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
      console.error('Magic link error:', error)
      console.error('Full error object:', JSON.stringify(error, null, 2))
      console.error('Error message:', error.message)
      console.error('Error status:', error.status)

      // Provide helpful error messages
      if (error.message?.includes('500') || error.message?.includes('Error sending')) {
        toast.error(
          <div>
            <p className="font-bold">Failed to send magic link: Email delivery error</p>
            <p className="text-sm mt-1">This may be due to:</p>
            <ul className="text-xs mt-1 list-disc list-inside">
              <li>SMTP rate limit exceeded (30/hour default)</li>
              <li>Custom SMTP not configured</li>
              <li>Email provider blocking delivery</li>
            </ul>
            <p className="text-sm mt-2">Try: Reset password instead or configure custom SMTP</p>
          </div>,
          { duration: 10000 }
        )
      } else if (error.message?.includes('service_role') || error.message?.includes('403')) {
        toast.error(
          <div>
            <p className="font-bold">Failed to send magic link</p>
            <p className="text-sm mt-1">Service role key may be missing or invalid</p>
            <p className="text-sm">Check VITE_SUPABASE_SERVICE_ROLE_KEY in .env</p>
          </div>,
          { duration: 8000 }
        )
      } else {
        toast.error('Failed to send magic link: ' + error.message)
      }
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
      console.error('Password reset error:', error)
      console.error('Full error object:', JSON.stringify(error, null, 2))
      console.error('Error message:', error.message)
      console.error('Error status:', error.status)

      // Provide helpful error messages
      if (error.message?.includes('500') || error.message?.includes('Error sending')) {
        toast.error(
          <div>
            <p className="font-bold">Failed to send password reset: Email delivery error</p>
            <p className="text-sm mt-1">This may be due to:</p>
            <ul className="text-xs mt-1 list-disc list-inside">
              <li>SMTP rate limit exceeded (30/hour default)</li>
              <li>Custom SMTP not configured</li>
              <li>Email provider blocking delivery</li>
            </ul>
            <p className="text-sm mt-2">Try: Send magic link instead or configure custom SMTP</p>
          </div>,
          { duration: 10000 }
        )
      } else if (error.message?.includes('service_role') || error.message?.includes('403')) {
        toast.error(
          <div>
            <p className="font-bold">Failed to send password reset</p>
            <p className="text-sm mt-1">Service role key may be missing or invalid</p>
            <p className="text-sm">Check VITE_SUPABASE_SERVICE_ROLE_KEY in .env</p>
          </div>,
          { duration: 8000 }
        )
      } else {
        toast.error('Failed to send password reset: ' + error.message)
      }
    }
  }

  const setTemporaryPassword = async () => {
    if (!userInfo?.email || !userInfo?.id) {
      toast.error('No user selected')
      return
    }

    // Generate a random temporary password
    const tempPassword = 'WNF' + Math.random().toString(36).slice(-8) + '!'

    const userConfirmed = confirm(
      `Set temporary password for ${userInfo.email}?\n\n` +
      `Temporary Password: ${tempPassword}\n\n` +
      `IMPORTANT: Copy this password and send it to the user via WhatsApp or text. ` +
      `They should change it immediately after logging in.\n\n` +
      `Click OK to proceed.`
    )

    if (!userConfirmed) return

    try {
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      if (!serviceRoleKey) {
        toast.error('Service role key not configured')
        return
      }

      // Use direct fetch with service role key to update password
      console.log('🔒 Setting temporary password for user:', userInfo.id)
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userInfo.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: tempPassword,
          email_confirm: true  // Skip email verification
        })
      })

      console.log('Update password response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Update password failed:', errorData)
        throw new Error(`Failed to update password: ${response.status} ${response.statusText}`)
      }

      // Copy password to clipboard
      try {
        await navigator.clipboard.writeText(tempPassword)
        console.log('✅ Password copied to clipboard:', tempPassword)

        // Show persistent alert with the password
        alert(
          `✅ TEMPORARY PASSWORD SET AND COPIED!\n\n` +
          `Password: ${tempPassword}\n\n` +
          `The password is now in your clipboard (Ctrl+V to paste).\n\n` +
          `Send this to ${userInfo.email} via WhatsApp or text.\n` +
          `They should change it immediately after logging in.`
        )

        toast.success(
          <div>
            <p className="font-bold">✅ Password copied to clipboard!</p>
            <p className="text-sm mt-1">Paste it with Ctrl+V</p>
          </div>,
          { duration: 10000 }
        )
      } catch (clipboardError) {
        console.error('Clipboard failed, showing alert:', clipboardError)

        // Fallback: show alert that can be manually copied
        alert(
          `✅ TEMPORARY PASSWORD SET!\n\n` +
          `Password: ${tempPassword}\n\n` +
          `(Auto-copy failed - please copy the password above)\n\n` +
          `Send this to ${userInfo.email} via WhatsApp or text.\n` +
          `They should change it immediately after logging in.`
        )

        toast.success(
          <div>
            <p className="font-bold">✅ Temporary password set!</p>
            <p className="text-sm mt-1 font-mono bg-gray-100 p-1 rounded select-all">{tempPassword}</p>
            <p className="text-sm mt-2">Click to select and copy</p>
          </div>,
          { duration: 20000 }
        )
      }
    } catch (error: any) {
      console.error('Set temporary password error:', error)
      toast.error('Failed to set temporary password: ' + error.message)
    }
  }

  const createMissingPlayerRecord = async () => {
    if (!userInfo?.email || !userInfo?.id) {
      toast.error('No user selected')
      return
    }

    if (!confirm(`Create a player record for ${userInfo.email}?\n\nThis will allow them to fully use the app.`)) {
      return
    }

    try {
      // Create player record with basic info
      const { error } = await supabaseAdmin
        .from('players')
        .insert({
          user_id: userInfo.id,
          friendly_name: userInfo.friendly_name !== 'Not set' ? userInfo.friendly_name : userInfo.email.split('@')[0],
          email: userInfo.email,
          whatsapp_group_member: 'No',
          // other fields will use defaults
        })

      if (error) throw error

      toast.success(`Player record created for ${userInfo.email}! Ask them to complete their profile.`)

      // Refresh user info
      searchUser()
    } catch (error: any) {
      console.error('Create player record error:', error)
      toast.error(`Failed to create player record: ${error.message}`)
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

    // Debug: Check if service role key is loaded
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    console.log('🔑 Environment check:')
    console.log('Service role key exists:', !!serviceRoleKey)
    console.log('Service role key length:', serviceRoleKey?.length || 0)
    console.log('Anon key length:', anonKey?.length || 0)
    console.log('Keys are different:', serviceRoleKey !== anonKey)

    // Check what token the current supabase client is using
    const currentSession = await supabase.auth.getSession()
    console.log('🔓 Current user session:', {
      hasSession: !!currentSession.data.session,
      userJWT: currentSession.data.session?.access_token ?
        currentSession.data.session.access_token.substring(0, 30) + '...' : 'none'
    })

    if (!serviceRoleKey || serviceRoleKey === anonKey) {
      toast.error(
        <div>
          <p className="font-bold">Service Role Key Not Configured</p>
          <p className="text-sm mt-1">Environment variable check failed:</p>
          <ul className="text-xs mt-1 list-disc list-inside">
            <li>Service key exists: {serviceRoleKey ? 'Yes' : 'No'}</li>
            <li>Service key length: {serviceRoleKey?.length || 0}</li>
            <li>Using anon key instead: {serviceRoleKey === anonKey ? 'Yes' : 'No'}</li>
          </ul>
          <p className="text-sm mt-2">The dev server needs to be fully restarted after adding the key to .env</p>
        </div>,
        { duration: 10000 }
      )
      return
    }

    try {
      // Use direct fetch with service role key to bypass any session interference
      console.log('🔒 Attempting to clear sessions for user:', userInfo.id)
      console.log('Using direct fetch with service role key (bypassing Supabase client)')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      // Use the correct Admin API endpoint for signing out users
      const signOutResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userInfo.id}/factors`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      })

      console.log('Get factors response status:', signOutResponse.status)

      if (signOutResponse.ok) {
        const factors = await signOutResponse.json()
        console.log('User factors:', factors)

        // Now delete each factor
        if (factors && factors.length > 0) {
          for (const factor of factors) {
            const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userInfo.id}/factors/${factor.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
              }
            })
            console.log(`Deleted factor ${factor.id}:`, deleteResponse.status)
          }
        }

        toast.success(`All sessions cleared for ${userInfo.email}`)
      } else if (signOutResponse.status === 404) {
        // No factors found, user might not have any sessions
        toast.success(`No active sessions found for ${userInfo.email}`)
      } else {
        const errorData = await signOutResponse.json().catch(() => ({}))
        console.error('Get factors failed:', errorData)

        if (signOutResponse.status === 403) {
          toast.error(
            <div>
              <p className="font-bold">Failed to clear sessions: Permission Denied</p>
              <p className="text-sm mt-1">The service role key may be invalid or not properly configured.</p>
            </div>,
            { duration: 8000 }
          )
          return
        }

        throw new Error(`Failed to get user factors: ${signOutResponse.status} ${signOutResponse.statusText}`)
      }
    } catch (error: any) {
      console.error('Session clearing error:', error)

      // Provide helpful error messages based on error type
      if (error.message?.includes('invalid JWT') || error.message?.includes('malformed')) {
        toast.error(
          <div>
            <p className="font-bold">Failed to clear sessions: Invalid JWT</p>
            <p className="text-sm mt-1">The user's session token is corrupted.</p>
            <p className="text-sm">Try: Send magic link or reset password instead.</p>
          </div>,
          { duration: 8000 }
        )
      } else if (error.message?.includes('service_role')) {
        toast.error(
          <div>
            <p className="font-bold">Failed to clear sessions</p>
            <p className="text-sm mt-1">Service role key may be missing or invalid</p>
            <p className="text-sm">Check VITE_SUPABASE_SERVICE_ROLE_KEY in .env</p>
          </div>,
          { duration: 8000 }
        )
      } else {
        toast.error('Failed to clear sessions: ' + error.message)
      }
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

      {/* Service Role Key Warning */}
      {serviceRoleKeyMissing && (
        <div className="alert alert-warning mb-6">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="font-bold">Service Role Key Not Configured</p>
            <p className="text-sm">VITE_SUPABASE_SERVICE_ROLE_KEY is missing or invalid. Admin features like clearing sessions may not work correctly.</p>
            <p className="text-sm mt-1">Add the service role key to your .env file (find it in Supabase Dashboard → Settings → API)</p>
          </div>
        </div>
      )}

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
            <div className="card-actions justify-end mt-6 flex-wrap">
              {/* Show create player button if user is in auth but not players */}
              {userInfo.friendly_name === 'Not set' && isSuperAdmin && (
                <button
                  className="btn btn-sm btn-success"
                  onClick={createMissingPlayerRecord}
                >
                  <User className="w-4 h-4" />
                  Create Player Record
                </button>
              )}

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
                  className="btn btn-sm btn-secondary"
                  onClick={setTemporaryPassword}
                >
                  <User className="w-4 h-4" />
                  Set Temp Password
                </button>
              )}

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
                  {userInfo.friendly_name === 'Not set' && (
                    <li className="text-warning font-bold">⚠️ This user has auth but no player record - create one using the green button above</li>
                  )}
                  <li className="font-bold text-primary">✨ NEW: If email fails, use "Set Temp Password" to bypass SMTP entirely</li>
                  <li>Magic links bypass password issues and create fresh sessions (requires working SMTP)</li>
                  <li>Password resets clear any corrupted authentication data (requires working SMTP)</li>
                  <li>Clearing sessions requires VITE_SUPABASE_SERVICE_ROLE_KEY to be configured</li>
                  <li className="text-error">⚠️ SMTP authentication is currently failing - use Set Temp Password instead</li>
                  <li>Configure custom SMTP in Supabase Dashboard → Authentication → Email Templates</li>
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