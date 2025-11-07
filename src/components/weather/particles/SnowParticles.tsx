/**
 * SnowParticles Component
 *
 * Generates animated SVG snowflakes for winter weather effects.
 * Features rotating, drifting snowflakes with varied designs.
 */

import React, { useMemo } from 'react';
import './SnowParticles.css';

interface SnowParticlesProps {
  /** Intensity of snow: 'light', 'moderate', or 'heavy' */
  intensity?: 'light' | 'moderate' | 'heavy';
}

interface Snowflake {
  id: number;
  x: number; // Starting horizontal position (0-100%)
  delay: number; // Animation delay in seconds
  duration: number; // Fall duration in seconds
  size: number; // Size multiplier
  opacity: number; // Opacity
  drift: number; // Horizontal drift amount (-20 to 20)
  rotationSpeed: number; // Rotation animation duration
  design: number; // Snowflake design variant (0-2)
}

/**
 * Detects device capabilities to determine particle count
 */
const getParticleCount = (intensity: string): number => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }

  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

  const counts = {
    light: { mobile: 15, tablet: 25, desktop: 35 },
    moderate: { mobile: 25, tablet: 40, desktop: 60 },
    heavy: { mobile: 40, tablet: 60, desktop: 90 }
  };

  const intensityKey = intensity as keyof typeof counts;
  const deviceCounts = counts[intensityKey];

  if (isMobile) return deviceCounts.mobile;
  if (isTablet) return deviceCounts.tablet;
  return deviceCounts.desktop;
};

/**
 * Generates randomized snowflake properties
 */
const generateSnowflakes = (count: number, intensity: string): Snowflake[] => {
  const flakes: Snowflake[] = [];

  // Vary properties based on intensity
  let baseDuration, baseSize, baseOpacity;

  switch (intensity) {
    case 'light':
      baseDuration = 10;  // Slower fall
      baseSize = 0.5;     // Smaller flakes
      baseOpacity = 0.6;  // More transparent
      break;
    case 'heavy':
      baseDuration = 6;   // Faster fall
      baseSize = 1.0;     // Larger flakes
      baseOpacity = 0.8;  // More opaque
      break;
    default: // moderate
      baseDuration = 8;
      baseSize = 0.75;
      baseOpacity = 0.7;
  }

  for (let i = 0; i < count; i++) {
    flakes.push({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: baseDuration + Math.random() * 4,
      size: baseSize + Math.random() * 0.4,
      opacity: baseOpacity + Math.random() * 0.2,
      drift: -20 + Math.random() * 40,
      rotationSpeed: 4 + Math.random() * 8,
      design: Math.floor(Math.random() * 3)
    });
  }

  return flakes;
};

/**
 * SnowParticles component renders animated snowflakes
 */
const SnowParticles: React.FC<SnowParticlesProps> = ({
  intensity = 'moderate'
}) => {
  const snowflakes = useMemo(() => {
    const count = getParticleCount(intensity);
    return generateSnowflakes(count, intensity);
  }, [intensity]);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  return (
    <div className="snow-particles-container" aria-hidden="true">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake-simple"
          style={{
            left: `${flake.x}%`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
            opacity: flake.opacity,
            width: `${8 + flake.size * 8}px`,
            height: `${8 + flake.size * 8}px`,
            '--drift-amount': `${flake.drift}px`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default SnowParticles;
