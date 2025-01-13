import React from 'react'
import { motion } from 'framer-motion'
import { Medal, Sparkles } from 'lucide-react'
import { PlayerCardProps } from './PlayerCardTypes'
import { PlayerCardModifiers } from './PlayerCardModifiers'
import { PlayerCardBadges } from './PlayerCardBadges'
import WhatsAppIndicator from '../indicators/WhatsAppIndicator'
import RankShield from './RankShield'
import { usePlayerPenalties } from '../../hooks/usePlayerPenalties'
import { useUser } from '../../hooks/useUser'

/**
 * Displays the front face of the player card with primary information
 */
export const PlayerCardFront: React.FC<PlayerCardProps & { rank?: number, isFlipped?: boolean }> = ({
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
  rank,
  isFlipped,
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
      
      {/* Rank Shield */}
      {rank && rank <= 16 && !isFlipped && (
        <div className="absolute top-2 right-2 z-10">
          <RankShield rank={rank} />
        </div>
      )}
      
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

      {/* Player name */}
      <div className="relative flex flex-col items-center">
        <div className="relative">
          <h2 className="text-lg font-bold mb-1">{friendlyName}</h2>
        </div>
      </div>

      {/* XP Section */}
      <div className="flex flex-col items-center">
        <span className="text-4xl font-bold">{xp}</span>
        <div className="flex items-center gap-1">
          <Sparkles className="w-5 h-5" />
          <span>XP</span>
        </div>
      </div>

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
