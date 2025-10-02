import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface StarRatingProps {
  rating: number | null;
  onChange: (rating: number | null) => void;
  label: string;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onChange, label }) => {
  const [hover, setHover] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState<string>('');

  // Update input value when rating prop changes
  useEffect(() => {
    if (rating === null || rating === 0) {
      setInputValue('');
    } else {
      setInputValue(String(rating / 2));
    }
  }, [rating]);

  const handleStarHover = (index: number, isHalf: boolean) => {
    const value = isHalf ? index * 2 - 1 : index * 2;
    setHover(value);
  };

  const handleStarClick = (index: number, isHalf: boolean) => {
    const value = isHalf ? index * 2 - 1 : index * 2;
    onChange(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setInputValue('');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 5) return;

    setInputValue(value);
    // Convert the 0-5 scale to 0-10 scale and round to nearest 0.5
    const ratingValue = Math.round(numValue * 2);
    onChange(ratingValue);
  };

  const handleInputBlur = () => {
    if (inputValue === '') {
      onChange(null);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-4 w-full">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="relative">
          <input
            type="number"
            min="0"
            max="5"
            step="0.5"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="w-16 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute right-[-24px] top-1/2 transform -translate-y-1/2 text-sm text-gray-500">/5</span>
        </div>
      </div>
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => {
          const starIndex = i + 1;
          const currentRating = hover ?? rating ?? 0;
          const isFullStar = currentRating >= starIndex * 2;
          const isHalfStar = currentRating === starIndex * 2 - 1;

          return (
            <div key={i} className="relative w-8 h-8">
              {/* Star container */}
              <div 
                className="absolute inset-0 cursor-pointer"
                onMouseLeave={() => setHover(null)}
              >
                {/* Left half hitbox */}
                <div
                  className="absolute left-0 w-1/2 h-full z-10"
                  onMouseEnter={() => handleStarHover(starIndex, true)}
                  onClick={() => handleStarClick(starIndex, true)}
                />
                {/* Right half hitbox */}
                <div
                  className="absolute right-0 w-1/2 h-full z-10"
                  onMouseEnter={() => handleStarHover(starIndex, false)}
                  onClick={() => handleStarClick(starIndex, false)}
                />

                {/* Empty star */}
                <svg
                  className="absolute inset-0 w-full h-full text-gray-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>

                {/* Filled star (full or half) */}
                <svg
                  className="absolute inset-0 w-full h-full text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  style={{
                    clipPath: isHalfStar ? 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' : isFullStar ? 'none' : 'polygon(0 0, 0 0, 0 0, 0 0)',
                  }}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StarRating;
