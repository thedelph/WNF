import React from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Rating } from '../types';
import { formatRating } from '../../../../utils/ratingFormatters';
import { FaClock, FaUser, FaStar, FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface RecentActivityProps {
  recentRatings: Rating[];
  onSelectPlayer: (playerId: string) => void;
  loading: boolean;
  title?: string;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  recentRatings,
  onSelectPlayer,
  loading,
  title
}) => {
  const getRatingChange = (current: number, previous: number | null | undefined) => {
    if (previous === null || previous === undefined) return null;
    const currentNum = Number(current);
    const previousNum = Number(previous);
    return currentNum - previousNum;
  };
  
  const getRatingChangeDisplay = (current: number, previous: number | null | undefined) => {
    const change = getRatingChange(current, previous);
    if (change === null) return null;
    
    if (change > 0) {
      return (
        <span className="text-success text-xs flex items-center gap-0.5 ml-1">
          <FaArrowUp className="text-[10px]" />
          +{change}
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="text-error text-xs flex items-center gap-0.5 ml-1">
          <FaArrowDown className="text-[10px]" />
          {change}
        </span>
      );
    }
    return null;
  };
  if (loading) {
    return (
      <div className="bg-base-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <FaClock className="text-primary" />
          <h3 className="text-lg font-semibold">{title || 'Recent Rating Activity'}</h3>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-20 w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (recentRatings.length === 0) {
    return (
      <div className="bg-base-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <FaClock className="text-primary" />
          <h3 className="text-lg font-semibold">{title || 'Recent Rating Activity'}</h3>
        </div>
        <p className="text-base-content/70">No recent ratings activity</p>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-lg p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <FaClock className="text-primary" />
        <h3 className="text-lg font-semibold">Recent Rating Activity</h3>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {recentRatings.map((rating, index) => (
          <motion.div
            key={rating.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-base-300 rounded-lg p-3 sm:p-4 hover:bg-base-100 transition-colors cursor-pointer"
            onClick={() => rating.rated_player?.id && onSelectPlayer(rating.rated_player.id)}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-start sm:items-center gap-2 flex-col sm:flex-row">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-primary text-sm" />
                    <span className="font-medium">{rating.rater?.friendly_name || 'Unknown'}</span>
                  </div>
                  <span className="text-base-content/70 text-sm">rated</span>
                  <span className="font-medium">{rating.rated_player?.friendly_name || 'Unknown'}</span>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2 text-sm">
                  <div className="badge badge-sm flex items-center">
                    <span>ATT: {formatRating(rating.attack_rating)}</span>
                    {getRatingChangeDisplay(rating.attack_rating, rating.previous_attack_rating)}
                  </div>
                  <div className="badge badge-sm flex items-center">
                    <span>DEF: {formatRating(rating.defense_rating)}</span>
                    {getRatingChangeDisplay(rating.defense_rating, rating.previous_defense_rating)}
                  </div>
                  <div className="badge badge-sm flex items-center">
                    <span>IQ: {formatRating(rating.game_iq_rating)}</span>
                    {getRatingChangeDisplay(rating.game_iq_rating, rating.previous_game_iq_rating)}
                  </div>
                  
                  {/* Playstyle changes */}
                  {(rating.playstyle || rating.previous_playstyle) && (
                    <div className={`badge badge-sm ${
                      rating.playstyle?.category === 'attacking' ? 'badge-error' :
                      rating.playstyle?.category === 'midfield' ? 'badge-warning' :
                      rating.playstyle?.category === 'defensive' ? 'badge-info' :
                      'badge-ghost'
                    }`}>
                      {(() => {
                        if (!rating.previous_playstyle && rating.playstyle) {
                          // New playstyle added
                          return (
                            <span className="flex items-center gap-1">
                              <span className="text-success text-xs">+</span>
                              {rating.playstyle.name}
                            </span>
                          );
                        } else if (rating.previous_playstyle && !rating.playstyle) {
                          // Playstyle removed
                          return (
                            <span className="flex items-center gap-1 line-through opacity-60">
                              {rating.previous_playstyle.name}
                            </span>
                          );
                        } else if (rating.previous_playstyle && rating.playstyle && 
                                   rating.previous_playstyle.id !== rating.playstyle.id) {
                          // Playstyle changed
                          return (
                            <span className="flex items-center gap-1" title={`Changed from ${rating.previous_playstyle.name} to ${rating.playstyle.name}`}>
                              <span className="text-warning text-xs">⟳</span>
                              <span>{rating.playstyle.name}</span>
                            </span>
                          );
                        } else if (rating.playstyle) {
                          // Playstyle unchanged
                          return <span>{rating.playstyle.name}</span>;
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-xs sm:text-sm text-base-content/70 whitespace-nowrap">
                {formatDistanceToNow(new Date(rating.updated_at || rating.created_at), { 
                  addSuffix: true 
                })}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-base-content/70 text-center">
        Click any activity to view full rating details
      </div>
    </div>
  );
};