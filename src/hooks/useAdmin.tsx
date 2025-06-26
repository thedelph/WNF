import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { Permission, PERMISSIONS } from '../types/permissions'

interface AdminStatus {
  isAdmin: boolean
  isSuperAdmin: boolean
  loading: boolean
  error: Error | null
  hasPermission: (permission: Permission) => boolean
  permissions: Permission[]
}

export const useAdmin = (): AdminStatus => {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        if (!user) {
          setIsAdmin(false)
          setIsSuperAdmin(false)
          setPermissions([])
          return
        }

        // First get the player record
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('id, is_admin, is_super_admin')
          .eq('user_id', user.id)
          .single()

        if (playerError) throw playerError

        const playerId = playerData?.id
        const isAdminFlag = playerData?.is_admin || false
        const isSuperAdminFlag = playerData?.is_super_admin || false

        setIsAdmin(isAdminFlag || isSuperAdminFlag)
        setIsSuperAdmin(isSuperAdminFlag)

        // If super admin, they have all permissions
        if (isSuperAdminFlag) {
          setPermissions(Object.values(PERMISSIONS))
          return
        }

        // If regular admin with is_admin flag, they have all non-super permissions
        if (isAdminFlag) {
          setPermissions(
            Object.values(PERMISSIONS).filter(
              p => p !== PERMISSIONS.MANAGE_ADMINS && p !== PERMISSIONS.MANAGE_RATINGS
            )
          )
          return
        }

        // Otherwise, check RBAC permissions
        if (playerId) {
          const { data: adminRole, error: roleError } = await supabase
            .from('admin_roles')
            .select(`
              id,
              role_id,
              is_custom_permissions,
              role:roles!admin_roles_role_id_fkey (
                id,
                name,
                role_permissions!role_permissions_role_id_fkey (
                  permission
                )
              ),
              admin_permissions!admin_permissions_admin_role_id_fkey (
                permission
              )
            `)
            .eq('player_id', playerId)
            .single()

          if (roleError && roleError.code !== 'PGRST116') throw roleError // PGRST116 = no rows

          if (adminRole) {
            setIsAdmin(true)
            
            // Collect permissions from role
            const rolePermissions = adminRole.role?.role_permissions?.map(rp => rp.permission as Permission) || []
            
            // Collect custom permissions
            const customPermissions = adminRole.admin_permissions?.map(ap => ap.permission as Permission) || []
            
            // Combine and deduplicate
            const allPermissions = [...new Set([...rolePermissions, ...customPermissions])]
            setPermissions(allPermissions)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to check admin status'))
        setIsAdmin(false)
        setIsSuperAdmin(false)
        setPermissions([])
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [user])

  const hasPermission = useCallback((permission: Permission): boolean => {
    // Super admins have all permissions
    if (isSuperAdmin) return true
    
    // Check if user has the specific permission
    return permissions.includes(permission)
  }, [isSuperAdmin, permissions])

  return { isAdmin, isSuperAdmin, loading, error, hasPermission, permissions }
} 