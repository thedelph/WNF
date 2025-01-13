import React from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Star, ListChecks, Flame } from 'lucide-react'
import { PlayerCardProps } from './PlayerCardTypes'
import WhatsAppIndicator from '../indicators/WhatsAppIndicator'

/**
 * Displays the back face of the player card with detailed statistics in a compact format
 */
export const PlayerCardBack: React.FC<PlayerCardProps> = ({
  id,
  friendlyName,
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
      {/* WhatsApp Indicator */}
      {(whatsapp_group_member === "Yes" || whatsapp_group_member === "Proxy") && (
        <WhatsAppIndicator 
          variant={whatsapp_group_member === "Proxy" ? "proxy" : "solid"} 
        />
      )}
      
      {/* Player name at the top */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="card-title text-lg font-bold">{friendlyName}</h2>
      </div>
      
      <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-white/10">
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
            <ListChecks className="w-4 h-4" />
            <span className="text-sm">Total Games</span>
          </div>
          <span className="font-bold text-sm">{totalGames}</span>
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
        <Link to={`/players/${id}`} className="badge badge-outline hover:bg-white/10">
          VIEW PROFILE
        </Link>
      </div>
    </div>
  )
}
