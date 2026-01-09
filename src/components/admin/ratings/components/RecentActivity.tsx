import React from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Rating } from '../types';
import { formatRating } from '../../../../utils/ratingFormatters';
import { FaClock, FaUser, FaStar, FaArrowUp, FaArrowDown, FaFutbol, FaShieldAlt, FaBrain } from 'react-icons/fa';
import { GiGoalKeeper } from 'react-icons/gi';

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

  const getChangedRatingIcons = (rating: Rating) => {
    const icons = [];

    // Show icon if the rating changed from a previous value (but not if it stayed the same)
    const attackChange = getRatingChange(rating.attack_rating, rating.previous_attack_rating);
    if (attackChange !== null && attackChange !== 0 && rating.previous_attack_rating !== null && rating.previous_attack_rating !== undefined) {
      icons.push(<FaFutbol key="attack" className="text-orange-500" title="Attack rating changed" />);
    }

    const defenseChange = getRatingChange(rating.defense_rating, rating.previous_defense_rating);
    if (defenseChange !== null && defenseChange !== 0 && rating.previous_defense_rating !== null && rating.previous_defense_rating !== undefined) {
      icons.push(<FaShieldAlt key="defense" className="text-blue-500" title="Defense rating changed" />);
    }

    const gameIqChange = getRatingChange(rating.game_iq_rating, rating.previous_game_iq_rating);
    if (gameIqChange !== null && gameIqChange !== 0 && rating.previous_game_iq_rating !== null && rating.previous_game_iq_rating !== undefined) {
      icons.push(<FaBrain key="gameiq" className="text-purple-500" title="Game IQ rating changed" />);
    }

    const gkChange = getRatingChange(rating.gk_rating, rating.previous_gk_rating);
    if (gkChange !== null && gkChange !== 0 && rating.previous_gk_rating !== null && rating.previous_gk_rating !== undefined) {
      icons.push(<GiGoalKeeper key="gk" className="text-green-500" title="GK rating changed" />);
    }

    // If no icons were added (meaning this is likely a new rating or first-time GK rating),
    // show GK icon if GK rating exists and wasn't previously rated
    if (icons.length === 0 && rating.gk_rating && (rating.previous_gk_rating === null || rating.previous_gk_rating === undefined)) {
      icons.push(<GiGoalKeeper key="gk" className="text-green-500" title="GK rating added" />);
    }

    return icons;
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
                  <div className="flex items-center gap-1 ml-2">
                    {getChangedRatingIcons(rating)}
                  </div>
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
                  <div className="badge badge-sm flex items-center">
                    <span>GK: {formatRating(rating.gk_rating)}</span>
                    {getRatingChangeDisplay(rating.gk_rating, rating.previous_gk_rating)}
                  </div>

                  {/* Playstyle changes */}
                  {(rating.playstyle || rating.previous_playstyle) && (
                    <div className="badge badge-sm badge-ghost">
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

                  {/* Position changes */}
                  {(() => {
                    const hasCurrentPositions = rating.position_1st || rating.position_2nd || rating.position_3rd;
                    const hasPreviousPositions = rating.previous_position_1st || rating.previous_position_2nd || rating.previous_position_3rd;

                    if (!hasCurrentPositions && !hasPreviousPositions) return null;

                    const positionsChanged =
                      rating.position_1st !== rating.previous_position_1st ||
                      rating.position_2nd !== rating.previous_position_2nd ||
                      rating.position_3rd !== rating.previous_position_3rd;

                    const renderPositionBadges = (first?: string | null, second?: string | null, third?: string | null, isNew = false, isOld = false) => (
                      <div className={`flex flex-wrap gap-1 ${isOld ? 'line-through opacity-60' : ''}`}>
                        {first && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[#FCD34D] text-gray-900 dark:text-gray-900">
                            🥇{first}
                          </span>
                        )}
                        {second && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[#9CA3AF] text-white dark:text-white">
                            🥈{second}
                          </span>
                        )}
                        {third && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[#EA580C] text-white dark:text-white">
                            🥉{third}
                          </span>
                        )}
                        {isNew && <span className="text-success text-xs">+</span>}
                      </div>
                    );

                    if (!hasPreviousPositions && hasCurrentPositions) {
                      // New positions added
                      return (
                        <div className="badge badge-sm badge-ghost p-2">
                          {renderPositionBadges(rating.position_1st, rating.position_2nd, rating.position_3rd, true)}
                        </div>
                      );
                    } else if (hasPreviousPositions && !hasCurrentPositions) {
                      // Positions removed
                      return (
                        <div className="badge badge-sm badge-ghost p-2">
                          {renderPositionBadges(rating.previous_position_1st, rating.previous_position_2nd, rating.previous_position_3rd, false, true)}
                        </div>
                      );
                    } else if (positionsChanged) {
                      // Positions changed
                      return (
                        <div className="badge badge-sm badge-ghost p-2"
                             title={`Changed from ${[rating.previous_position_1st, rating.previous_position_2nd, rating.previous_position_3rd].filter(Boolean).join(', ')} to ${[rating.position_1st, rating.position_2nd, rating.position_3rd].filter(Boolean).join(', ')}`}>
                          <span className="text-warning text-xs mr-1">⟳</span>
                          {renderPositionBadges(rating.position_1st, rating.position_2nd, rating.position_3rd)}
                        </div>
                      );
                    } else {
                      // Positions unchanged
                      return (
                        <div className="badge badge-sm badge-ghost p-2">
                          {renderPositionBadges(rating.position_1st, rating.position_2nd, rating.position_3rd)}
                        </div>
                      );
                    }
                  })()}
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