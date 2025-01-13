import React from 'react'
import { motion } from 'framer-motion'
import { Medal, Sparkles } from 'lucide-react'
import { PlayerCardProps } from './PlayerCardTypes'
import { PlayerCardModifiers } from './PlayerCardModifiers'
import { PlayerCardBadges } from './PlayerCardBadges'
import WhatsAppIndicator from '../indicators/WhatsAppIndicator'
import { usePlayerPenalties } from '../../hooks/usePlayerPenalties'
import { useUser } from '../../hooks/useUser'

/**
 * Displays the front face of the player card with primary information
 */
export const PlayerCardFront: React.FC<PlayerCardProps> = ({
  id,
  friendlyName,
  xp,
  caps,
  activeBonuses,
  activePenalties,
  currentStreak,
  benchWarmerStreak,
  rarity,
  isRandomlySelected,
  status,
  hasSlotOffer,
  slotOfferStatus,
  slotOfferExpiresAt,
  slotOfferAvailableAt,
  potentialOfferTimes,
  hasActiveSlotOffers,
  whatsapp_group_member,
  children,
}) => {
  const { dropoutPenalties } = usePlayerPenalties(id)
  const { player } = useUser()

  const streakModifier = currentStreak * 0.1
  const bonusModifier = activeBonuses * 0.1
  const penaltyModifier = activePenalties * -0.1
  const dropoutModifier = dropoutPenalties * -0.5
  const benchWarmerModifier = benchWarmerStreak > 0 ? benchWarmerStreak * 0.05 : 0

  return (
    <div className="card-body p-4">
      {/* WhatsApp Indicator */}
      {(whatsapp_group_member === "Yes" || whatsapp_group_member === "Proxy") && (
        <WhatsAppIndicator 
          variant={whatsapp_group_member === "Proxy" ? "proxy" : "solid"} 
        />
      )}
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="card-title text-lg font-bold">{friendlyName}</h2>
      </div>
      
      {/* Status badges */}
      <PlayerCardBadges
        isRandomlySelected={isRandomlySelected}
        status={status}
        hasSlotOffer={hasSlotOffer}
        slotOfferStatus={slotOfferStatus}
        slotOfferExpiresAt={slotOfferExpiresAt}
        slotOfferAvailableAt={slotOfferAvailableAt}
        potentialOfferTimes={potentialOfferTimes}
        hasActiveSlotOffers={hasActiveSlotOffers}
      >
        {children}
      </PlayerCardBadges>

      {/* Caps Section */}
      <div className="bg-black/30 rounded-lg p-3 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Medal className="w-5 h-5" />
            <span className="text-sm">Caps</span>
          </div>
          <span className="text-2xl font-bold">{caps}</span>
        </div>
      </div>

      {/* XP Section */}
      <div className="mb-4">
        <div className="bg-black/40 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-bold">XP</span>
            </div>
            <span className="text-3xl font-bold">{xp}</span>
          </div>
        </div>
      </div>

      {/* Modifiers Section */}
      <PlayerCardModifiers
        currentStreak={currentStreak}
        streakModifier={streakModifier}
        dropoutPenalties={dropoutPenalties}
        dropoutModifier={dropoutModifier}
        activeBonuses={activeBonuses}
        bonusModifier={bonusModifier}
        activePenalties={activePenalties}
        penaltyModifier={penaltyModifier}
        benchWarmerStreak={benchWarmerStreak}
        benchWarmerModifier={benchWarmerModifier}
      />

      <div className="mt-auto">
        {player?.id === id && (
          <div className="absolute bottom-4 left-4 badge badge-neutral">You</div>
        )}
        <div className="absolute bottom-4 right-4 badge badge-outline">{rarity}</div>
      </div>
    </div>
  )
}
