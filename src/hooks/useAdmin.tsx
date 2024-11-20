import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'

interface AdminStatus {
  isAdmin: boolean
  isSuperAdmin: boolean
  loading: boolean
  error: Error | null
}

export const useAdmin = (): AdminStatus => {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        if (!user) {
          setIsAdmin(false)
          setIsSuperAdmin(false)
          return
        }

        const { data, error } = await supabase
          .from('players')
          .select('is_admin, is_super_admin')
          .eq('user_id', user.id)
          .single()

        if (error) throw error

        setIsAdmin(data?.is_admin || data?.is_super_admin || false)
        setIsSuperAdmin(data?.is_super_admin || false)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to check admin status'))
        setIsAdmin(false)
        setIsSuperAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [user])

  return { isAdmin, isSuperAdmin, loading, error }
} 