import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../utils/supabase'
import { Venue } from '../types/game'

export const useVenues = () => {
  const [venues, setVenues] = useState<Venue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const { data, error } = await supabaseAdmin
          .from('venues')
          .select('*')
          .order('name')

        if (error) throw error
        setVenues(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch venues'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchVenues()
  }, [])

  return { venues, isLoading, error }
}
