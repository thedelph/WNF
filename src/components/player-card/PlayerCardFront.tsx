import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Medal, Sparkles, Activity } from 'lucide-react'
import { PiCoinDuotone } from "react-icons/pi"
import { MdPauseCircle } from "react-icons/md"
import { PlayerCardProps } from './PlayerCardTypes'
import { PlayerCardModifiers } from './PlayerCardModifiers'
import { PlayerCardBadges } from './PlayerCardBadges'
import WhatsAppIndicator from '../indicators/WhatsAppIndicator'
import RankShield from './RankShield'
import { usePlayerPenalties } from '../../hooks/usePlayerPenalties'
import { useUser } from '../../hooks/useUser'
import { Tooltip } from '../ui/Tooltip'
import { getMatchPercentage } from '../../utils/playstyleUtils'
import { generateAttributeAbbreviations } from '../../types/playstyle'
import { PREDEFINED_PLAYSTYLES } from '../../data/playstyles'
import { GameParticipationWheel } from './GameParticipationWheel'

/**
 * Displays the front face of the player card with primary information
 * Note: unpaidGames only includes past games that are unpaid and over 24 hours old
 */
export const PlayerCardFront: React.FC<PlayerCardProps & {
  rank?: number,
  isFlipped?: boolean,
  unpaidGames?: number, // Number of past unpaid games
  unpaidGamesModifier?: number, // XP modifier from past unpaid games (-50% per game)
  registrationStreakBonus?: number,
  registrationStreakBonusApplies?: boolean,
  usingToken?: boolean,
  playstyleRatingsCount?: number,
  shieldActive?: boolean,
  protectedStreakValue?: number | null,
  /** @deprecated Use protectedStreakValue instead */
  frozenStreakValue?: number | null,
  // Injury token fields
  injuryTokenActive?: boolean,
  injuryOriginalStreak?: number | null,
  injuryReturnStreak?: number | null,
  recentGames?: number,
  gameParticipation?: Array<'selected' | 'reserve' | 'dropped_out' | null>, // Array of 40 elements showing participation status in each of the last 40 games
  onTokenCooldown?: boolean,
}> = ({
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
  recentGames = 0,
  gameParticipation = new Array(40).fill(null),
  onTokenCooldown = false,
}) => {
  const { dropoutPenalties } = usePlayerPenalties(id)
  const { player } = useUser()
  const [showPlaystyleDetails, setShowPlaystyleDetails] = useState(false)

  // v2 diminishing returns formula for streak bonus
  const calculateStreakBonus = (streak: number): number => {
    if (streak <= 0) return 0;
    if (streak <= 10) {
      // Sum formula: 10 + 9 + 8 + ... + (11 - streak)
      return (streak * 11 - (streak * (streak + 1)) / 2) / 100;
    }
    // 55% + 1% for each game beyond 10
    return (55 + (streak - 10)) / 100;
  };
  const streakModifier = calculateStreakBonus(currentStreak)
  const bonusModifier = activeBonuses * 0.1
  const penaltyModifier = activePenalties * -0.1
  const dropoutModifier = dropoutPenalties * -0.5
  const benchWarmerModifier = benchWarmerStreak * 0.05
  const registrationStreakModifier = registrationStreakBonus * 0.025

  // Calculate total XP modifier including registration streak bonus
  // Note: unpaidGamesModifier is now calculated in XPBreakdown component to properly handle dropped out players
  const totalXpModifier = (1 + streakModifier + bonusModifier + penaltyModifier + dropoutModifier + benchWarmerModifier +
    (registrationStreakBonusApplies ? registrationStreakModifier : 0))

  // Calculate match percentage for the fill wheel
  const getMatchFillPercentage = (distance: number | undefined) => {
    if (distance === undefined || distance === null) return 0;
    return getMatchPercentage(distance);
  };

  // Create SVG circle progress indicator
  const MatchWheel = ({ percentage }: { percentage: number }) => {
    const radius = 5;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <svg width="12" height="12" className="rotate-[-90deg] flex-shrink-0">
        {/* Background circle */}
        <circle
          cx="6"
          cy="6"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="opacity-20"
        />
        {/* Filled circle */}
        <circle
          cx="6"
          cy="6"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
    );
  };

  // Get match quality text
  const getMatchQualityText = (distance: number | undefined) => {
    if (!distance) return '';
    const percentage = getMatchPercentage(distance);
    if (distance <= 0.33) return `Perfect Match (${percentage}%)`;
    if (distance <= 0.80) return `Excellent Match (${percentage}%)`;
    if (distance <= 1.25) return `Good Match (${percentage}%)`;
    if (distance <= 1.75) return `Moderate Match (${percentage}%)`;
    return `Weak Match (${percentage}%)`;
  };

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
          src="/assets/wnf-logo-removed-bg.png"
          alt=""
          className="w-4/5 h-auto"
          style={{
            opacity: 0.08,
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
      
      {/* Token indicator at top */}
      {usingToken && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
          <Tooltip content="Using Priority Token">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <PiCoinDuotone size={24} className="text-yellow-400" />
            </motion.div>
          </Tooltip>
        </div>
      )}

      {/* Token Cooldown indicator */}
      {onTokenCooldown && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
          <Tooltip content="Token Cooldown - used token in previous game (deprioritized this week)">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <MdPauseCircle size={24} className="text-warning" />
            </motion.div>
          </Tooltip>
        </div>
      )}

      {/* Rank Shield */}
      {rank && !isFlipped && (
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

      {/* Recent Games Section (Last 40) */}
      <div className="bg-black/30 rounded-lg p-2 mb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <div className="text-xs text-center leading-tight">
              <div>Last 40 Games</div>
              <div>{gameParticipation.filter(s => s === 'reserve').length > 0 ? 'Played/Reserve' : 'Played'}</div>
            </div>
          </div>
          {/* Number with participation wheel */}
          <div className="relative flex items-center justify-center" style={{ width: '60px', height: '60px' }}>
            {/* Participation wheel */}
            <GameParticipationWheel
              participation={gameParticipation}
              rarity={rarity}
              size={60}
            />
            {/* Number centered on top */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center leading-none" style={{ marginTop: '-2px' }}>
                <span className="text-2xl font-bold">{recentGames}</span>
                {gameParticipation.filter(s => s === 'reserve').length > 0 && (
                  <span className="text-xs font-normal opacity-70">/{gameParticipation.filter(s => s === 'reserve').length}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modifiers Section */}
      <PlayerCardModifiers
        playerId={id}
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
        unpaidGames={unpaidGames}
        unpaidGamesModifier={unpaidGamesModifier}
        registrationStreakBonus={registrationStreakBonus}
        registrationStreakBonusApplies={registrationStreakBonusApplies}
        status={status}
        shieldActive={shieldActive}
        protectedStreakValue={protectedStreakValue ?? frozenStreakValue}
        injuryTokenActive={injuryTokenActive}
        injuryOriginalStreak={injuryOriginalStreak}
        injuryReturnStreak={injuryReturnStreak}
      />

      <div className="mt-auto">
        {/* "You" badge if applicable - positioned separately */}
        {player?.id === id && (
          <div className="absolute bottom-12 left-4">
            <div className="badge badge-neutral">You</div>
          </div>
        )}

        {/* Bottom badges container - ensures perfect alignment */}
        <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-between items-center">
          {/* Playstyle badge on the left - show "TBD" if less than 5 ratings */}
          {averagedPlaystyle ? (() => {
            // Check if we have enough ratings (5 or more)
            const hasEnoughRatings = playstyleRatingsCount && playstyleRatingsCount >= 5;
            const displayText = hasEnoughRatings ? averagedPlaystyle : 'TBD';

            // Find the matching playstyle to get its attributes (only if we have enough ratings)
            const matchingPlaystyle = hasEnoughRatings ? PREDEFINED_PLAYSTYLES.find(p => p.name === averagedPlaystyle) : null;
            const abbreviations = matchingPlaystyle ? generateAttributeAbbreviations({
              has_pace: matchingPlaystyle.has_pace,
              has_shooting: matchingPlaystyle.has_shooting,
              has_passing: matchingPlaystyle.has_passing,
              has_dribbling: matchingPlaystyle.has_dribbling,
              has_defending: matchingPlaystyle.has_defending,
              has_physical: matchingPlaystyle.has_physical,
            }) : '';

            // Build tooltip content
            let tooltipContent = '';
            if (hasEnoughRatings) {
              const matchQuality = getMatchQualityText(playstyleMatchDistance);
              tooltipContent = abbreviations
                ? `${matchQuality}\nAttributes: ${abbreviations}`
                : matchQuality;
            } else {
              tooltipContent = `Needs ${5 - (playstyleRatingsCount || 0)} more ratings`;
            }

            // On mobile, clicking toggles showing the details
            const handleClick = (e: React.MouseEvent) => {
              // Prevent card flip on badge click
              e.stopPropagation();
              // Only toggle on touch devices (and only if we have enough ratings)
              if ('ontouchstart' in window && hasEnoughRatings) {
                setShowPlaystyleDetails(!showPlaystyleDetails);
              }
            };

            // Calculate wheel percentage based on context
            const wheelPercentage = hasEnoughRatings
              ? getMatchFillPercentage(playstyleMatchDistance)  // Match quality wheel
              : ((playstyleRatingsCount || 0) / 5) * 100;      // Progress wheel (e.g., 4/5 = 80%)

            return (
              <Tooltip content={tooltipContent}>
                <div
                  className="badge badge-outline badge-md inline-flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
                  onClick={handleClick}
                >
                  <MatchWheel percentage={wheelPercentage} />
                  <span>{displayText}</span>
                </div>
              </Tooltip>
            );
          })() : <div />}

          {/* Rarity badge on the right */}
          <div className="badge badge-outline badge-md px-3 py-2">{rarity}</div>
        </div>

        {/* Mobile-only expanded view - positioned separately */}
        {showPlaystyleDetails && averagedPlaystyle && playstyleRatingsCount && playstyleRatingsCount >= 5 && (() => {
          const matchingPlaystyle = PREDEFINED_PLAYSTYLES.find(p => p.name === averagedPlaystyle);
          const abbreviations = matchingPlaystyle ? generateAttributeAbbreviations({
            has_pace: matchingPlaystyle.has_pace,
            has_shooting: matchingPlaystyle.has_shooting,
            has_passing: matchingPlaystyle.has_passing,
            has_dribbling: matchingPlaystyle.has_dribbling,
            has_defending: matchingPlaystyle.has_defending,
            has_physical: matchingPlaystyle.has_physical,
          }) : '';
          const matchPercentage = getMatchFillPercentage(playstyleMatchDistance);

          if (abbreviations) {
            return (
              <div className={`absolute left-4 sm:hidden ${player?.id === id ? 'bottom-16' : 'bottom-12'}`}>
                <div className="badge badge-outline badge-xs">
                  <span className="text-[10px] opacity-75">{abbreviations} • {matchPercentage}% match</span>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  )
}
