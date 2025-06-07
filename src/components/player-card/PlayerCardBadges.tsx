import React from 'react'
import { PlayerCardBadgesProps } from './PlayerCardTypes'

/**
 * Displays status badges for the player card including random pick, slot offers, and custom badges
 */
export const PlayerCardBadges: React.FC<PlayerCardBadgesProps> = ({
  isRandomlySelected,
  status,
  hasSlotOffer,
  slotOfferStatus,
  slotOfferExpiresAt,
  slotOfferAvailableAt,
  potentialOfferTimes,
  hasActiveSlotOffers,
  children,
}) => {
  const getStatusBadge = () => {
    if (!status || status !== 'dropped_out') return null;

    return (
      <div className="badge badge-error badge-sm">
        Dropped Out
      </div>
    );
  };

  const getSlotOfferStatus = () => {
    const now = new Date();

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
    if (potentialOfferTimes && !hasAcceptedOffer) {
      const availableTime = new Date(potentialOfferTimes[0]);
      const nextAccessTime = new Date(potentialOfferTimes[1]);
      
      if (now < availableTime) {
        return {
          hasAccess: false,
          timeUntilAccess: formatTimeRemaining(availableTime)
        };
      }

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
    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
      {isRandomlySelected && (
        <div className="badge badge-secondary badge-sm">Random Pick</div>
      )}
      {getStatusBadge()}
      {getSlotOfferBadge()}
      {children}
    </div>
  )
}
