import React from 'react';

interface StarRatingProps {
  rating: number;     // Rating from 0-5 stars
  maxRating?: number; // Maximum rating (default: 5)
  className?: string; // Optional CSS class
  showValue?: boolean; // Whether to show numeric value
  compareRating?: number; // Optional rating to compare with (for before/after)
}

/**
 * Star Rating component that displays a rating as stars
 * Supports partial stars (half and quarter)
 * Can optionally show a "before/after" comparison with a second rating
 */
export const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  maxRating = 5, 
  className = '', 
  showValue = false,
  compareRating
}) => {
  // Ensure rating is within bounds
  const normalizedRating = Math.max(0, Math.min(rating, maxRating));
  
  // Round to nearest quarter for precision
  const roundedRating = Math.round(normalizedRating * 4) / 4;

  const stars = [];
  
  // Generate stars
  for (let i = 1; i <= maxRating; i++) {
    const difference = roundedRating - i;
    
    // Full star
    if (difference >= 0) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    } 
    // Three-quarter star
    else if (difference >= -0.25) {
      stars.push(<span key={i} className="text-yellow-400">★<span className="absolute" style={{ clipPath: 'inset(0 25% 0 0)', color: 'rgba(200, 200, 200, 0.3)', marginLeft: '-1em' }}>★</span></span>);
    }
    // Half star
    else if (difference >= -0.5) {
      stars.push(<span key={i} className="text-yellow-400">★<span className="absolute" style={{ clipPath: 'inset(0 50% 0 0)', color: 'rgba(200, 200, 200, 0.3)', marginLeft: '-1em' }}>★</span></span>);
    }
    // Quarter star
    else if (difference >= -0.75) {
      stars.push(<span key={i} className="text-yellow-400">★<span className="absolute" style={{ clipPath: 'inset(0 75% 0 0)', color: 'rgba(200, 200, 200, 0.3)', marginLeft: '-1em' }}>★</span></span>);
    }
    // Empty star
    else {
      stars.push(<span key={i} className="text-gray-300">★</span>);
    }
  }
  
  // If there's a comparison rating, show it as a translucent overlay
  if (compareRating !== undefined) {
    const normalizedCompare = Math.max(0, Math.min(compareRating, maxRating));
    const roundedCompare = Math.round(normalizedCompare * 4) / 4;
    
    const difference = roundedCompare - roundedRating;
    
    return (
      <div className={`flex items-center relative ${className}`}>
        <div className="relative">
          {stars}
        </div>
        
        {showValue && (
          <span className="ml-2 text-sm font-semibold">
            {roundedRating.toFixed(2)} → {roundedCompare.toFixed(2)}
            <span className={`ml-2 ${difference > 0 ? 'text-green-500' : difference < 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {difference > 0 ? `+${difference.toFixed(2)}` : difference.toFixed(2)}
            </span>
          </span>
        )}
        
        <div className="absolute left-0" style={{ opacity: 0.5 }}>
          {Array.from({ length: maxRating }).map((_, i) => {
            const starDiff = roundedCompare - (i + 1);
            if (starDiff >= 0) {
              return <span key={i} className="text-green-400">★</span>;
            } else if (starDiff >= -0.25) {
              return <span key={i} className="text-green-400">★<span className="absolute" style={{ clipPath: 'inset(0 25% 0 0)', color: 'rgba(220, 220, 220, 0.3)', marginLeft: '-1em' }}>★</span></span>;
            } else if (starDiff >= -0.5) {
              return <span key={i} className="text-green-400">★<span className="absolute" style={{ clipPath: 'inset(0 50% 0 0)', color: 'rgba(220, 220, 220, 0.3)', marginLeft: '-1em' }}>★</span></span>;
            } else if (starDiff >= -0.75) {
              return <span key={i} className="text-green-400">★<span className="absolute" style={{ clipPath: 'inset(0 75% 0 0)', color: 'rgba(220, 220, 220, 0.3)', marginLeft: '-1em' }}>★</span></span>;
            }
            return <span key={i} className="text-gray-300">★</span>;
          })}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center ${className}`}>
      <div>{stars}</div>
      {showValue && <span className="ml-2 text-sm">{roundedRating.toFixed(2)}</span>}
    </div>
  );
};
