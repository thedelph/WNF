/**
 * LightningBolt Component
 *
 * Generates dramatic lightning effects for thunderstorm weather.
 * Features random bolt patterns and screen flash effects.
 */

import React, { useState, useEffect } from 'react';
import './LightningBolt.css';

interface LightningBoltProps {
  /** Intensity: 'moderate' or 'heavy' */
  intensity?: 'moderate' | 'heavy';
}

interface LightningStrike {
  id: number;
  path: string;
  x: number; // Position (0-100%)
  visible: boolean;
}

/**
 * Generates a random lightning bolt path
 */
const generateLightningPath = (startX: number): string => {
  const segments = 6 + Math.floor(Math.random() * 4); // 6-9 segments
  let currentX = startX;
  let currentY = 0;
  let path = `M ${currentX} ${currentY}`;

  for (let i = 0; i < segments; i++) {
    // Add slight horizontal variation (zigzag)
    currentX += (Math.random() - 0.5) * 15;
    currentY += 12 + Math.random() * 8;

    // Main bolt segment
    path += ` L ${currentX} ${currentY}`;

    // Occasionally add a branch (30% chance)
    if (Math.random() < 0.3 && i < segments - 2) {
      const branchX = currentX + (Math.random() - 0.5) * 20;
      const branchY = currentY + 5 + Math.random() * 10;
      path += ` M ${currentX} ${currentY} L ${branchX} ${branchY}`;
      path += ` M ${currentX} ${currentY}`; // Return to main bolt
    }
  }

  return path;
};

/**
 * LightningBolt component renders lightning strikes with flash effects
 */
const LightningBolt: React.FC<LightningBoltProps> = ({
  intensity = 'moderate'
}) => {
  const [strikes, setStrikes] = useState<LightningStrike[]>([]);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Determine strike frequency based on intensity
    const strikeInterval = intensity === 'heavy' ? 4000 : 6000; // 4s or 6s
    const boltCount = intensity === 'heavy' ? 2 : 1; // 1 or 2 simultaneous bolts

    const triggerLightning = () => {
      const newStrikes: LightningStrike[] = [];

      // Create one or more lightning bolts
      for (let i = 0; i < boltCount; i++) {
        const x = 20 + Math.random() * 60; // Position between 20-80%
        newStrikes.push({
          id: Date.now() + i,
          path: generateLightningPath(x),
          x,
          visible: true
        });
      }

      setStrikes(newStrikes);
      setFlash(true);

      // Hide lightning after brief display
      setTimeout(() => {
        setStrikes([]);
        setFlash(false);
      }, 200); // Lightning visible for 200ms
    };

    // Random initial delay (0-3 seconds)
    const initialDelay = Math.random() * 3000;

    // Schedule first strike
    const initialTimeout = setTimeout(() => {
      triggerLightning();

      // Set up recurring strikes
      const interval = setInterval(() => {
        // Add randomness to strike timing (±1 second)
        const randomDelay = Math.random() * 2000 - 1000;
        setTimeout(triggerLightning, randomDelay);
      }, strikeInterval);

      return () => clearInterval(interval);
    }, initialDelay);

    return () => clearTimeout(initialTimeout);
  }, [intensity]);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  return (
    <>
      {/* Screen flash effect */}
      <div className={`lightning-flash ${flash ? 'active' : ''}`} aria-hidden="true" />

      {/* Lightning bolts */}
      <div className="lightning-container" aria-hidden="true">
        {strikes.map((strike) => (
          <svg
            key={strike.id}
            className="lightning-bolt"
            style={{ left: `${strike.x}%` }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Glow filter for lightning */}
              <filter id={`lightning-glow-${strike.id}`}>
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Outer glow */}
            <path
              d={strike.path}
              stroke="rgba(255, 255, 100, 0.6)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#lightning-glow-${strike.id})`}
            />

            {/* Main bolt */}
            <path
              d={strike.path}
              stroke="rgba(255, 255, 255, 0.95)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Inner bright core */}
            <path
              d={strike.path}
              stroke="rgba(255, 255, 255, 1)"
              strokeWidth="0.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ))}
      </div>
    </>
  );
};

export default LightningBolt;
