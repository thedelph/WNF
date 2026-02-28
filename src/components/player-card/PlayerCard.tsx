import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { PlayerCardFront } from './PlayerCardFront'
import { PlayerCardBack } from './PlayerCardBack'

/**
 * A flippable card component that displays player information and statistics
 * The card can be flipped to show more detailed information on the back
 */
interface PlayerCardProps {
  id: string
  friendlyName: string
  xp: number
  caps: number
  activeBonuses: number
  activePenalties: number
  winRate: number
  wins?: number
  draws?: number
  losses?: number
  totalGames?: number
  currentStreak: number
  maxStreak: number
  benchWarmerStreak?: number
  rarity?: 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary' | 'Retired' | 'Academy'
  avatarSvg?: string
  isRandomlySelected?: boolean
  status?: string
  hasSlotOffer?: boolean
  slotOfferStatus?: string
  slotOfferExpiresAt?: string
  slotOfferAvailableAt?: string
  potentialOfferTimes?: string[]
  hasActiveSlotOffers?: boolean
  whatsapp_group_member?: string
  children?: React.ReactNode
  rank?: number
  unpaidGames?: number
  unpaidGamesModifier?: number
  registrationStreakBonus?: number
  registrationStreakBonusApplies?: boolean
  usingToken?: boolean
  averagedPlaystyle?: string
  playstyleMatchDistance?: number
  playstyleCategory?: 'attacking' | 'midfield' | 'defensive'
  playstyleRatingsCount?: number
  shieldActive?: boolean
  protectedStreakValue?: number | null
  /** @deprecated Use protectedStreakValue instead */
  frozenStreakValue?: number | null
  // Injury token fields
  injuryTokenActive?: boolean
  injuryOriginalStreak?: number | null
  injuryReturnStreak?: number | null
  injuryStreakBonus?: number | null
  recentGames?: number
  gameParticipation?: Array<'selected' | 'reserve' | 'dropped_out' | null>
  onTokenCooldown?: boolean
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  id,
  friendlyName,
  xp,
  caps,
  activeBonuses,
  activePenalties,
  winRate,
  wins = 0,
  draws = 0,
  losses = 0,
  totalGames = 0,
  currentStreak,
  maxStreak,
  benchWarmerStreak = 0,
  rarity,
  avatarSvg,
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
  unpaidGames = 0,
  unpaidGamesModifier = 0,
  registrationStreakBonus = 0,
  registrationStreakBonusApplies = false,
  usingToken = false,
  averagedPlaystyle,
  playstyleMatchDistance,
  playstyleCategory,
  playstyleRatingsCount,
  shieldActive = false,
  protectedStreakValue = null,
  frozenStreakValue = null,
  injuryTokenActive = false,
  injuryOriginalStreak = null,
  injuryReturnStreak = null,
  injuryStreakBonus = null,
  recentGames = 0,
  gameParticipation = new Array(40).fill(null),
  onTokenCooldown = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false)

  const getRarityColor = (rarity: string | undefined) => {
    if (!rarity) return 'bg-gradient-to-br from-slate-300 via-slate-400 to-zinc-600 shadow-lg shadow-slate-500/50'
    switch (rarity) {
      case 'Legendary':
        return 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 shadow-lg shadow-yellow-500/50 animate-gradient-xy'
      case 'World Class':
        return 'bg-gradient-to-br from-purple-300 via-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/50 animate-gradient-xy'
      case 'Professional':
        return 'bg-gradient-to-br from-blue-300 via-blue-500 to-cyan-600 shadow-lg shadow-blue-500/50 animate-gradient-xy'
      case 'Semi Pro':
        return 'bg-gradient-to-br from-green-300 via-green-500 to-emerald-600 shadow-lg shadow-green-500/50 animate-gradient-xy'
      case 'Retired':
        // Black design for retired players (0 XP)
        return 'bg-gray-900 text-gray-100 shadow-lg shadow-slate-700/50 border border-gray-800'
      case 'Academy':
        // Deep teal design for academy players (0 caps, 0 XP) - better contrast for white text
        return 'bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 shadow-lg shadow-teal-600/50 animate-pulse-slow'
      case 'Amateur':
        return 'bg-gradient-to-br from-slate-300 via-slate-400 to-zinc-600 shadow-lg shadow-slate-500/50'
      default:
        return 'bg-gradient-to-br from-slate-300 via-slate-400 to-zinc-600 shadow-lg shadow-slate-500/50'
    }
  }

  // Only pass unpaid games data if it's valid (player was selected and didn't drop out)
  const validUnpaidGames = status === 'dropped_out' ? 0 : unpaidGames;
  const validUnpaidGamesModifier = status === 'dropped_out' ? 0 : unpaidGamesModifier;

  return (
    <motion.div 
      className="card w-64 h-96 cursor-pointer perspective"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div 
        className="relative w-full h-full preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of card */}
        <div 
          className={`absolute w-full h-full ${getRarityColor(rarity)} text-white rounded-xl p-4`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {!isFlipped ? (
            <PlayerCardFront
              id={id}
              friendlyName={friendlyName}
              xp={xp}
              caps={caps}
              activeBonuses={activeBonuses}
              activePenalties={activePenalties}
              winRate={winRate}
              currentStreak={currentStreak}
              maxStreak={maxStreak}
              benchWarmerStreak={benchWarmerStreak}
              rarity={rarity}
              isRandomlySelected={isRandomlySelected}
              status={status}
              hasSlotOffer={hasSlotOffer}
              slotOfferStatus={slotOfferStatus}
              slotOfferExpiresAt={slotOfferExpiresAt}
              slotOfferAvailableAt={slotOfferAvailableAt}
              potentialOfferTimes={potentialOfferTimes}
              hasActiveSlotOffers={hasActiveSlotOffers}
              whatsapp_group_member={whatsapp_group_member}
              rank={rank}
              wins={wins}
              draws={draws}
              losses={losses}
              totalGames={totalGames}
              unpaidGames={validUnpaidGames}
              unpaidGamesModifier={validUnpaidGamesModifier}
              registrationStreakBonus={registrationStreakBonus}
              registrationStreakBonusApplies={registrationStreakBonusApplies}
              usingToken={usingToken}
              averagedPlaystyle={averagedPlaystyle}
              playstyleMatchDistance={playstyleMatchDistance}
              playstyleCategory={playstyleCategory}
              playstyleRatingsCount={playstyleRatingsCount}
              shieldActive={shieldActive}
              protectedStreakValue={protectedStreakValue ?? frozenStreakValue}
              injuryTokenActive={injuryTokenActive}
              injuryOriginalStreak={injuryOriginalStreak}
              injuryReturnStreak={injuryReturnStreak}
              injuryStreakBonus={injuryStreakBonus}
              recentGames={recentGames}
              gameParticipation={gameParticipation}
              onTokenCooldown={onTokenCooldown}
            />
          ) : (
            <PlayerCardBack
              id={id}
              friendlyName={friendlyName}
              xp={xp}
              caps={caps}
              activeBonuses={activeBonuses}
              activePenalties={activePenalties}
              winRate={winRate}
              wins={wins}
              draws={draws}
              losses={losses}
              totalGames={totalGames}
              currentStreak={currentStreak}
              maxStreak={maxStreak}
              rarity={rarity}
              avatarSvg={avatarSvg}
              whatsapp_group_member={whatsapp_group_member}
              shieldActive={shieldActive}
              protectedStreakValue={protectedStreakValue ?? frozenStreakValue}
            />
          )}
        </div>

        {/* Back of card */}
        <div
          className={`absolute w-full h-full ${getRarityColor(rarity)} text-white rounded-xl p-4`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <PlayerCardBack
            id={id}
            friendlyName={friendlyName}
            xp={xp}
            caps={caps}
            activeBonuses={activeBonuses}
            activePenalties={activePenalties}
            winRate={winRate}
            wins={wins}
            draws={draws}
            losses={losses}
            totalGames={totalGames}
            currentStreak={currentStreak}
            maxStreak={maxStreak}
            rarity={rarity}
            avatarSvg={avatarSvg}
            whatsapp_group_member={whatsapp_group_member}
            shieldActive={shieldActive}
            protectedStreakValue={protectedStreakValue ?? frozenStreakValue}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

export default PlayerCard
