import React from 'react';

export interface StarRatingProps {
  score: number;
  maxScore?: number;
}

/**
 * StarRating component displays a visual representation of a balance score
 * Lower scores are better (0 = perfect balance)
 */
export const StarRating: React.FC<StarRatingProps> = ({ score, maxScore = 5 }) => {
  // Convert score to star rating (0-5 stars)
  // Lower scores are better, so we invert the scale
  const calculateRating = (score: number): number => {
    // Cap at maxScore
    const cappedScore = Math.min(score, maxScore);
    // Convert to 0-5 scale (inverted, so 0 score = 5 stars)
    return Math.max(0, 5 - (cappedScore / (maxScore / 5)));
  };

  const rating = calculateRating(score);
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center text-xs">
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < fullStars) {
          return <span key={i} className="text-yellow-400">★</span>;
        } else if (i === fullStars && hasHalfStar) {
          return <span key={i} className="text-yellow-400">⯨</span>;
        } else {
          return <span key={i} className="text-gray-300 dark:text-gray-600">★</span>;
        }
      })}
    </div>
  );
};
