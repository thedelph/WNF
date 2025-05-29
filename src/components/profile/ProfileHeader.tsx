import { motion } from 'framer-motion'
// Import types from the root src directory
import type { ExtendedPlayerData } from 'src/types/profile'
import { Tooltip } from '../ui/Tooltip'
import { Shield } from 'lucide-react'
import type { RarityTier } from '../../utils/rarityCalculations'

/**
 * Helper function to determine the badge class based on rarity tier
 * @param rarity - The player's rarity tier
 * @returns The appropriate badge class
 */
const getRarityBadgeClass = (rarity: string): string => {
  switch (rarity) {
    case 'Legendary':
      return 'badge-warning'; // Gold/yellow for top 2%
    case 'World Class':
      return 'badge-secondary'; // Purple for top 7%
    case 'Professional':
      return 'badge-accent'; // Teal/green for top 20%
    case 'Semi Pro':
      return 'badge-info'; // Blue for top 40%
    case 'Amateur':
      return 'badge-neutral'; // Gray for any XP > 0
    case 'Retired':
      return 'badge-ghost'; // Transparent for 0 XP
    default:
      return 'badge-ghost';
  }
};

interface ProfileHeaderProps {
  profile: ExtendedPlayerData
  onEditClick: () => void
  onAvatarEditClick: () => void
  onPasswordResetClick: () => void
}

export default function ProfileHeader({ 
  profile, 
  onEditClick,
  onAvatarEditClick,
  onPasswordResetClick
}: ProfileHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-base-200 rounded-box p-8 shadow-lg mb-6 relative"
    >
      {/* Password Reset Button - Top Right for desktop, below name on mobile */}
      <div className="hidden sm:block absolute top-4 right-4">
        <Tooltip content="Change your password">
          <button 
            onClick={onPasswordResetClick}
            className="btn btn-outline btn-xs h-8 px-2"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-3.5 w-3.5 mr-1.5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              style={{ position: 'relative', top: '0px' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span style={{ position: 'relative', top: '0px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.02em' }}>CHANGE PASSWORD</span>
          </button>
        </Tooltip>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar Section */}
        <Tooltip content="Click to edit your avatar">
          <div 
            onClick={onAvatarEditClick}
            className="relative w-32 h-32 cursor-pointer group transition-all hover:scale-105"
          >
            {profile.avatar_svg ? (
              // The avatar_svg is already a data URL, so use an img tag directly
              <div className="w-full h-full rounded-full ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all shadow-xl overflow-hidden">
                <img 
                  src={profile.avatar_svg} 
                  alt={`${profile.friendly_name}'s avatar`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all shadow-xl">
                <span className="text-4xl font-bold text-white">
                  {profile.friendly_name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {/* Edit overlay */}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
        </Tooltip>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left">
          {/* Player Name */}
          <div className="flex flex-col items-center sm:items-start mt-1 mb-2 md:mb-0">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white sm:text-left">
              {profile.friendly_name}
            </h2>
          </div>
          
          {/* Mobile Password Reset Button - only visible on small screens */}
          <div className="sm:hidden mt-2 flex justify-center">
            <Tooltip content="Change your password">
              <button 
                onClick={onPasswordResetClick}
                className="btn btn-outline btn-xs gap-1 px-2"
                style={{ height: '26px', display: 'inline-flex', alignItems: 'center' }}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3 mr-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.02em' }}>CHANGE PASSWORD</span>
              </button>
            </Tooltip>
          </div>

          {/* XP and Rarity Display */}
          <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:gap-4 items-center sm:items-start">
            <div className="badge badge-lg badge-primary">
              {profile.total_xp || profile.xp} XP
            </div>
            {profile.rarity && (
              <div className={`badge badge-lg ${getRarityBadgeClass(profile.rarity)}`}>
                {profile.rarity}
              </div>
            )}
          </div>

          {/* Rank Display */}
          <div className="mt-4 flex flex-wrap gap-4 justify-center sm:justify-start text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Rank:</span>
              {/* Use the same RankShield component as in PlayerCardFront */}
              {profile.rank > 0 ? (
                <Tooltip content={`Ranked #${profile.rank} in XP`}>
                  <div className="relative inline-flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                    <span className="absolute text-[10px] font-bold text-black">
                      {profile.rank}
                    </span>
                  </div>
                </Tooltip>
              ) : (
                <span>Calculating...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
