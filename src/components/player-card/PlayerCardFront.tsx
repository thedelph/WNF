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
      {/* Football pitch background watermark */}
      <div className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: 'soft-light' }}>
        <svg
          className="w-full h-full"
          viewBox="0 0 50 80"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Field markings */}
          <g fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.15">
            {/* Outer border */}
            <rect x="0" y="0" width="50" height="80" />
            
            {/* Center line */}
            <line x1="0" y1="40" x2="50" y2="40" />
            
            {/* Center circle */}
            <circle cx="25" cy="40" r="7" />
            <circle cx="25" cy="40" r="0.5" fill="white" fillOpacity="0.15"/>
            
            {/* Penalty areas */}
            <rect x="9" y="0" width="32" height="13" />
            <rect x="9" y="67" width="32" height="13" />
            
            {/* Goal areas */}
            <rect x="18" y="0" width="14" height="4" />
            <rect x="18" y="76" width="14" height="4" />
            
            {/* Corner arcs */}
            <path d="M 0 1 A 1 1 0 0 0 1 0" />
            <path d="M 49 0 A 1 1 0 0 0 50 1" />
            <path d="M 1 80 A 1 1 0 0 0 0 79" />
            <path d="M 50 79 A 1 1 0 0 0 49 80" />
            
            {/* Penalty spots */}
            <circle cx="25" cy="9" r="0.5" fill="white" fillOpacity="0.15"/>
            <circle cx="25" cy="71" r="0.5" fill="white" fillOpacity="0.15"/>
            
            {/* Penalty arcs */}
            <path d="M 19.26 13 A 7 7 0 0 0 30.74 13" />
            <path d="M 19.26 67 A 7 7 0 0 1 30.74 67" />
          </g>
        </svg>
      </div>

      {/* WNF Logo watermark */}
      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{ mixBlendMode: 'soft-light' }}
      >
        <img 
          src="/assets/wnf.webp" 
          alt="" 
          className="w-2/3 h-auto opacity-10"
          style={{ 
            filter: 'grayscale(100%) brightness(1.5) contrast(1.2)',
            transform: 'rotate(-20deg)'
          }}
        />
      </div>

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
