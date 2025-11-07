/**
 * WindStreaks Component
 *
 * Generates animated wind streak effects to visualize wind.
 * Features horizontal moving lines with varied speeds and opacity.
 */

import React, { useMemo } from 'react';
import './WindStreaks.css';

interface WindStreaksProps {
  /** Wind intensity: 'light', 'moderate', or 'strong' */
  intensity?: 'light' | 'moderate' | 'strong';
}

interface WindStreak {
  id: number;
  y: number; // Vertical position (0-100%)
  delay: number; // Animation delay in seconds
  duration: number; // Animation duration in seconds
  length: number; // Length of streak (20-80px)
  opacity: number; // Opacity (0.2-0.6)
  height: number; // Thickness of line (1-3px)
}

/**
 * Detects device capabilities to determine particle count
 */
const getStreakCount = (intensity: string): number => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }

  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

  const counts = {
    light: { mobile: 8, tablet: 12, desktop: 15 },
    moderate: { mobile: 10, tablet: 15, desktop: 20 },
    strong: { mobile: 12, tablet: 18, desktop: 25 }
  };

  const intensityKey = intensity as keyof typeof counts;
  const deviceCounts = counts[intensityKey];

  if (isMobile) return deviceCounts.mobile;
  if (isTablet) return deviceCounts.tablet;
  return deviceCounts.desktop;
};

/**
 * Generates randomized wind streak properties
 */
const generateWindStreaks = (count: number, intensity: string): WindStreak[] => {
  const streaks: WindStreak[] = [];

  // Base speed varies by intensity
  const baseDuration = intensity === 'light' ? 2.5 : intensity === 'moderate' ? 2.0 : 1.5;

  for (let i = 0; i < count; i++) {
    streaks.push({
      id: i,
      y: Math.random() * 100, // Random vertical position
      delay: Math.random() * 3, // Random start delay
      duration: baseDuration + Math.random() * 1, // Slight speed variation
      length: 30 + Math.random() * 50, // 30-80px length
      opacity: 0.2 + Math.random() * 0.4, // 0.2-0.6 opacity
      height: intensity === 'strong' ? 2 + Math.random() : 1 + Math.random() * 2 // 1-3px height
    });
  }

  return streaks;
};

/**
 * WindStreaks component renders animated wind lines
 */
const WindStreaks: React.FC<WindStreaksProps> = ({
  intensity = 'moderate'
}) => {
  const streaks = useMemo(() => {
    const count = getStreakCount(intensity);
    return generateWindStreaks(count, intensity);
  }, [intensity]);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  return (
    <div className="wind-streaks-container" aria-hidden="true">
      {streaks.map((streak) => (
        <div
          key={streak.id}
          className="wind-streak"
          style={{
            top: `${streak.y}%`,
            width: `${streak.length}px`,
            height: `${streak.height}px`,
            opacity: streak.opacity,
            animationDelay: `${streak.delay}s`,
            animationDuration: `${streak.duration}s`
          }}
        />
      ))}
    </div>
  );
};

export default WindStreaks;
