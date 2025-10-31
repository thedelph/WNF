import React from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Star, Medal, Flame, DollarSign } from 'lucide-react'
import { PlayerCardProps } from './PlayerCardTypes'
import WhatsAppIndicator from '../indicators/WhatsAppIndicator'
import { toUrlFriendly } from '../../utils/urlHelpers'

/**
 * Displays the back face of the player card with detailed statistics in a compact format
 */
export const PlayerCardBack: React.FC<PlayerCardProps> = ({
  id,
  friendlyName,
  caps,
  winRate,
  wins,
  draws,
  losses,
  totalGames,
  currentStreak,
  maxStreak,
  avatarSvg,
  whatsapp_group_member,
}) => {
  return (
    <div className="card-body p-4 text-white">
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
      
      {/* Player name at the top */}
      <div className="relative flex flex-col items-center">
        <div className="relative">
          <h2 className="text-lg font-bold mb-1">{friendlyName}</h2>
        </div>
      </div>
      
      <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden relative z-10">
        <img 
          src={avatarSvg || '/default-avatar.svg'} 
          alt="Player Avatar" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="bg-black/30 rounded-lg p-3 space-y-1.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4" />
            <span className="text-sm">Win Rate</span>
          </div>
          {totalGames >= 10 ? (
            <span className="font-bold text-sm">{winRate?.toFixed(1) || '0.0'}%</span>
          ) : (
            <span className="text-xs opacity-70">Pending ({totalGames}/10)</span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4" />
            <span className="text-sm">W/D/L</span>
          </div>
          <span className="font-bold text-sm">{wins} / {draws} / {losses}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Medal className="w-4 h-4" />
            <span className="text-sm">Caps</span>
          </div>
          <span className="font-bold text-sm">{caps}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4" />
            <span className="text-sm">Current Streak</span>
          </div>
          <span className="font-bold text-sm">{currentStreak}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4" />
            <span className="text-sm">Max Streak</span>
          </div>
          <span className="font-bold text-sm">{maxStreak}</span>
        </div>
      </div>

      <div className="mt-2 flex justify-center">
        <Link 
          to={`/player/${toUrlFriendly(friendlyName)}`} 
          className="badge badge-lg badge-outline hover:bg-white/10 px-4 py-3 text-sm font-semibold z-10"
          onClick={(e) => e.stopPropagation()}
        >
          VIEW PROFILE
        </Link>
      </div>
    </div>
  )
}
