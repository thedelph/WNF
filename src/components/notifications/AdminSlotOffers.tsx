import React from 'react'
import { supabase } from '../../utils/supabase'
import { Player, PlayerDBResponse, transformPlayerFromDB } from '../../types/player'
import { Game, GameDBResponse, transformGameFromDB } from '../../types/game'
import { SlotOffer, SlotOfferDBResponse, transformSlotOfferFromDB } from '../../types/slotOffers'
import { toast } from 'react-hot-toast'
import { Badge } from '../ui/Badge'

export const SlotOfferBadges = {
  pending: 'badge-warning',
  accepted: 'badge-success',
  declined: 'badge-error',
  expired: 'badge-neutral'
} as const

interface AdminSlotOffersProps {
  className?: string
}

export const AdminSlotOffers: React.FC<AdminSlotOffersProps> = ({ className }) => {
  const [slotOffers, setSlotOffers] = React.useState<SlotOffer[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchSlotOffers = async () => {
    try {
      setIsLoading(true)
      const { data: offersData, error: offersError } = await supabase
        .from('slot_offers')
        .select(`
          *,
          player:player_id (*),
          game:game_id (*)
        `)
        .order('created_at', { ascending: false })

      if (offersError) throw offersError

      const transformedOffers = await Promise.all(
        (offersData || []).map(async (offerData: any) => {
          const player = transformPlayerFromDB(offerData.player as PlayerDBResponse)
          const game = transformGameFromDB(offerData.game as GameDBResponse)
          return transformSlotOfferFromDB(offerData as SlotOfferDBResponse, player, game)
        })
      )

      setSlotOffers(transformedOffers)
    } catch (error) {
      console.error('Error fetching slot offers:', error)
      toast.error('Failed to load slot offers')
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    fetchSlotOffers()

    // Set up realtime subscription
    const channel = supabase
      .channel('slot-offers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slot_offers'
        },
        () => {
          fetchSlotOffers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (isLoading) {
    return <div>Loading slot offers...</div>
  }

  return (
    <div className={className}>
      <h2 className="text-xl font-bold mb-4">Slot Offers</h2>
      <div className="space-y-4">
        {slotOffers.length === 0 ? (
          <p>No slot offers found</p>
        ) : (
          slotOffers.map(offer => (
            <div
              key={offer.id}
              className="card bg-base-200 shadow-xl"
            >
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="card-title">
                      {offer.player?.friendlyName || 'Unknown Player'}
                    </h3>
                    <p className="text-sm opacity-70">
                      Game: {offer.game?.gameNumber || 'Unknown Game'}
                    </p>
                    <p className="text-sm opacity-70">
                      Created: {new Date(offer.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm opacity-70">
                      Expires: {new Date(offer.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={SlotOfferBadges[offer.status]}>
                    {offer.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
