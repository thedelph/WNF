import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'

interface BetaTesterStatus {
  isBetaTester: boolean
  loading: boolean
  error: Error | null
}

export const useBetaTester = (): BetaTesterStatus => {
  const { user } = useAuth()
  const [isBetaTester, setIsBetaTester] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const checkBetaTesterStatus = async () => {
      try {
        if (!user) {
          setIsBetaTester(false)
          return
        }

        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('is_beta_tester')
          .eq('user_id', user.id)
          .single()

        if (playerError) throw playerError

        setIsBetaTester(playerData?.is_beta_tester || false)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to check beta tester status'))
        setIsBetaTester(false)
      } finally {
        setLoading(false)
      }
    }

    checkBetaTesterStatus()
  }, [user])

  return { isBetaTester, loading, error }
}