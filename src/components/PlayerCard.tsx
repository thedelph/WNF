import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Star, Medal, CircleOff, CircleDot, Sparkles } from 'lucide-react'
import { usePlayerPenalties } from '../hooks/usePlayerPenalties';
import { useUser } from '../hooks/useUser';

interface PlayerCardProps {
  id: string
  friendlyName: string
  xp: number
  caps: number
  preferredPosition: string
  activeBonuses: number
  activePenalties: number
  winRate: number
  currentStreak: number
  maxStreak: number
  rarity: 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary'
  avatarSvg: string
  isRandomlySelected?: boolean
  status?: 'selected' | 'reserve' | 'dropped_out';
  hasSlotOffer?: boolean;
  slotOfferStatus?: 'pending' | 'accepted' | 'declined';
  slotOfferExpiresAt?: string;
  slotOfferAvailableAt?: string;
  potentialOfferTimes?: {
    available_time: string;
    next_player_access_time: string;
  } | null;
  hasActiveSlotOffers?: boolean;
  children?: React.ReactNode;
}

export default function PlayerCard({
  id,
  friendlyName,
  xp,
  caps,
  preferredPosition,
  activeBonuses,
  activePenalties,  
  winRate,
  currentStreak,
  maxStreak,
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
  children
}: PlayerCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const { dropoutPenalties } = usePlayerPenalties(id);
  const { player } = useUser();

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Legendary':
        return 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600 shadow-lg shadow-yellow-500/50 animate-gradient-xy'
      case 'World Class':
        return 'bg-gradient-to-br from-purple-300 via-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/50 animate-gradient-xy'
      case 'Professional':
        return 'bg-gradient-to-br from-blue-300 via-blue-500 to-cyan-600 shadow-lg shadow-blue-500/50 animate-gradient-xy'
      case 'Semi Pro':
        return 'bg-gradient-to-br from-green-300 via-green-500 to-emerald-600 shadow-lg shadow-green-500/50 animate-gradient-xy'
      default:
        return 'bg-gradient-to-br from-slate-300 via-slate-400 to-zinc-600 shadow-lg shadow-slate-500/50'
    }
  }

  const streakModifier = currentStreak * 0.1;
  const bonusModifier = activeBonuses * 0.1;
  const penaltyModifier = activePenalties * -0.1;
  const dropoutModifier = dropoutPenalties * -0.5; // 50% penalty per dropout
  const totalModifier = streakModifier + bonusModifier + penaltyModifier + dropoutModifier;

  const getStatusBadge = () => {
    if (!status || status !== 'dropped_out') return null;

    return (
      <div className="badge badge-error badge-sm">
        Dropped Out
      </div>
    );
  };

  const getSlotOfferStatus = () => {
    const now = new Date(); // Use current time

    // Check if any slot has been accepted
    const hasAcceptedOffer = slotOfferStatus === 'accepted';
    if (hasAcceptedOffer) return null;

    // If the offer was declined, show declined status
    if (slotOfferStatus === 'declined') {
      return {
        hasAccess: false,
        isDeclined: true
      };
    }

    // For players with active offers
    if (hasSlotOffer && slotOfferStatus === 'pending') {
      const availableTime = new Date(slotOfferAvailableAt);
      const nextAccessTime = slotOfferExpiresAt ? new Date(slotOfferExpiresAt) : null;
      
      if (now < availableTime) {
        return {
          hasAccess: false,
          timeUntilAccess: formatTimeRemaining(availableTime)
        };
      }

      return {
        hasAccess: true,
        timeUntilNextAccess: nextAccessTime ? formatTimeRemaining(nextAccessTime) : null,
        isFirstAccess: true
      };
    }

    // For players with no current offer but have potential times
    // Only show if no slot has been accepted yet
    if (potentialOfferTimes && !hasAcceptedOffer) {
      const availableTime = new Date(potentialOfferTimes.available_time);
      const nextAccessTime = new Date(potentialOfferTimes.next_player_access_time);
      
      // Check if this player should get an offer (based on if previous player declined)
      if (now < availableTime) {
        return {
          hasAccess: false,
          timeUntilAccess: formatTimeRemaining(availableTime)
        };
      }

      // If we're in the offer window
      if (now >= availableTime && now < nextAccessTime) {
        return {
          hasAccess: true,
          timeUntilNextAccess: formatTimeRemaining(nextAccessTime),
          isFirstAccess: true
        };
      }
    }

    return null;
  };

  const getSlotOfferBadge = () => {
    if (!hasActiveSlotOffers) return null;
    
    const offerStatus = getSlotOfferStatus();
    if (!offerStatus) return null;

    if (offerStatus.isDeclined) {
      return (
        <div className="badge badge-error badge-sm">
          Declined
        </div>
      );
    }

    if (!offerStatus.hasAccess) {
      return (
        <div className="badge badge-neutral badge-sm flex gap-1 items-center">
          <span>Available in</span>
          {offerStatus.timeUntilAccess && (
            <span className="text-xs">
              {offerStatus.timeUntilAccess}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="badge badge-info badge-sm flex gap-1 items-center">
        <span>Available Now</span>
      </div>
    );
  };

  const formatTimeRemaining = (targetTime: Date) => {
    const now = new Date();
    const diff = targetTime.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <motion.div 
      className="card w-64 h-96 cursor-pointer perspective"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div 
        className="relative w-full h-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Front of card */}
        <motion.div 
          className={`absolute w-full h-full ${getRarityColor(rarity)} text-white rounded-xl p-4 backface-hidden`}
          initial={false}
          animate={{ opacity: isFlipped ? 0 : 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="card-body p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="card-title text-xl">{friendlyName}</h2>
            </div>
            
            {/* Status badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
              {isRandomlySelected && (
                <div className="badge badge-secondary badge-sm">Random Pick</div>
              )}
              {getStatusBadge()}
              {getSlotOfferBadge()}
              {children}
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
            <div className="space-y-2">
              {currentStreak > 0 && (
                <motion.div 
                  className="flex justify-between items-center bg-green-500/20 rounded-lg p-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">Streak Bonus</span>
                  </div>
                  <span className="text-sm font-bold">+{(streakModifier * 100).toFixed(0)}%</span>
                </motion.div>
              )}
              {dropoutPenalties > 0 && (
                <motion.div 
                  className="flex justify-between items-center bg-red-500/20 rounded-lg p-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                >
                  <div className="flex items-center gap-2">
                    <CircleOff className="w-4 h-4" />
                    <span className="text-sm">Dropout Penalty</span>
                  </div>
                  <span className="text-sm font-bold text-red-500">-{(dropoutModifier * -100).toFixed(0)}%</span>
                </motion.div>
              )}
              {activeBonuses > 0 && (
                <motion.div 
                  className="flex justify-between items-center bg-green-500/20 rounded-lg p-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    <span className="text-sm">Active Bonuses</span>
                  </div>
                  <span className="text-sm font-bold">+{(bonusModifier * 100).toFixed(0)}%</span>
                </motion.div>
              )}
              {activePenalties > 0 && (
                <motion.div 
                  className="flex justify-between items-center bg-red-500/20 rounded-lg p-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                >
                  <div className="flex items-center gap-2">
                    <CircleOff className="w-4 h-4" />
                    <span className="text-sm">Active Penalties</span>
                  </div>
                  <span className="text-sm font-bold">{(penaltyModifier * 100).toFixed(0)}%</span>
                </motion.div>
              )}
            </div>

            <div className="mt-auto">
              {player?.id === id && (
                <div className="absolute bottom-4 left-4 badge badge-neutral">You</div>
              )}
              <div className="absolute bottom-4 right-4 badge badge-outline">{rarity}</div>
            </div>
          </div>
        </motion.div>

        {/* Back of card */}
        <motion.div 
          className={`absolute w-full h-full ${getRarityColor(rarity)} rounded-xl p-4 backface-hidden`}
          initial={false}
          animate={{ opacity: isFlipped ? 1 : 0, rotateY: 180 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col items-center justify-between h-full text-white">
            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-white/20">
              <img 
                src={avatarSvg || '/default-avatar.svg'} 
                alt="Player Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="bg-black/30 rounded-lg p-4 w-full space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span>Win Rate</span>
                </div>
                <span className="font-bold">{typeof winRate === 'number' ? winRate.toFixed(1) : '0.0'}%</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span>Current Streak</span>
                </div>
                <span className="font-bold">{currentStreak}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Medal className="w-4 h-4" />
                  <span>Max Streak</span>
                </div>
                <span className="font-bold">{maxStreak}</span>
              </div>
            </div>

            <Link 
              to={`/players/${id}`} 
              className="btn btn-ghost btn-outline border-white/20 text-white hover:bg-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              View Profile
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}