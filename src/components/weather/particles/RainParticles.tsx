/**
 * RainParticles Component
 *
 * Generates animated SVG raindrops for weather effects.
 * Performance-optimized with device-aware particle counts and CSS transforms.
 */

import React, { useMemo } from 'react';
import './RainParticles.css';

interface RainParticlesProps {
  /** Intensity of rain: 'light', 'moderate', or 'heavy' */
  intensity?: 'light' | 'moderate' | 'heavy';
  /** Whether it's nighttime (affects color) */
  isNight?: boolean;
}

interface RainDrop {
  id: number;
  x: number; // Horizontal position (0-100%)
  delay: number; // Animation delay in seconds
  duration: number; // Animation duration in seconds
  length: number; // Length of raindrop
  opacity: number; // Opacity of raindrop
}

/**
 * Detects device capabilities to determine particle count
 */
const getParticleCount = (intensity: string): number => {
  // Check if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }

  // Detect device type by screen width
  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

  // Particle counts based on device and intensity
  const counts = {
    light: { mobile: 12, tablet: 20, desktop: 30 },
    moderate: { mobile: 15, tablet: 25, desktop: 40 },
    heavy: { mobile: 18, tablet: 30, desktop: 50 }
  };

  const intensityKey = intensity as keyof typeof counts;
  const deviceCounts = counts[intensityKey];

  if (isMobile) return deviceCounts.mobile;
  if (isTablet) return deviceCounts.tablet;
  return deviceCounts.desktop;
};

/**
 * Generates randomized raindrop properties
 */
const generateRaindrops = (count: number, intensity: string): RainDrop[] => {
  const drops: RainDrop[] = [];

  for (let i = 0; i < count; i++) {
    // Vary raindrop properties based on intensity
    const baseLength = intensity === 'light' ? 15 : intensity === 'moderate' ? 20 : 25;
    const baseDuration = intensity === 'light' ? 1.2 : intensity === 'moderate' ? 1.0 : 0.8;

    drops.push({
      id: i,
      x: Math.random() * 100, // Random horizontal position
      delay: Math.random() * 2, // Random start delay (0-2s)
      duration: baseDuration + Math.random() * 0.4, // Slight variation in fall speed
      length: baseLength + Math.random() * 10, // Vary length
      opacity: 0.4 + Math.random() * 0.4 // Vary opacity (0.4-0.8)
    });
  }

  return drops;
};

/**
 * RainParticles component renders animated raindrops
 */
const RainParticles: React.FC<RainParticlesProps> = ({
  intensity = 'moderate',
  isNight = false
}) => {
  // Memoize raindrop generation to prevent re-renders
  const raindrops = useMemo(() => {
    const count = getParticleCount(intensity);
    return generateRaindrops(count, intensity);
  }, [intensity]);

  // Don't render if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  return (
    <div className="rain-particles-container" aria-hidden="true">
      {raindrops.map((drop) => (
        <div
          key={drop.id}
          className="raindrop"
          style={{
            left: `${drop.x}%`,
            height: `${drop.length}px`,
            opacity: drop.opacity,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
            background: isNight
              ? 'linear-gradient(to bottom, rgba(200, 220, 255, 0.9), rgba(150, 180, 220, 0.7))'
              : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(174, 214, 241, 0.7))'
          }}
        />
      ))}
    </div>
  );
};

export default RainParticles;
