import React from 'react';
import { getRarityColor, getRarityColorInactive, type Rarity } from '../../utils/rarityColors';

interface GameParticipationWheelProps {
  /** Boolean array of 40 elements showing participation in each of the last 40 games */
  participation: boolean[];
  /** Player's rarity tier for color theming */
  rarity?: Rarity;
  /** Size of the wheel in pixels */
  size?: number;
  /** Color for active segments (participated) - overrides rarity color if provided */
  activeColor?: string;
  /** Color for inactive segments (didn't participate) */
  inactiveColor?: string;
}

/**
 * GameParticipationWheel - Displays a circular visualization of player participation
 * in the last 40 games. The wheel is divided into 40 segments, with each segment
 * representing one game. Active segments (games played) are highlighted.
 *
 * Segments are arranged clockwise starting from the top (12 o'clock position),
 * with segment 0 (oldest game) at the top and segment 39 (most recent) near the top.
 */
export const GameParticipationWheel: React.FC<GameParticipationWheelProps> = ({
  participation,
  rarity,
  size = 60,
  activeColor,
  inactiveColor = 'rgba(255, 255, 255, 0.1)'
}) => {
  // Use rarity-based color if no explicit color provided
  const finalActiveColor = activeColor || getRarityColor(rarity);
  const finalInactiveColor = inactiveColor || getRarityColorInactive();
  const center = size / 2;
  const outerRadius = size / 2 - 1.5;
  const innerRadius = size / 2 - 6; // 4.5px thick segments (proportional to 60px size)
  const segmentCount = 40;
  const anglePerSegment = (2 * Math.PI) / segmentCount;
  const gapAngle = 0.015; // Small gap between segments for visual separation

  // Generate SVG path for each segment
  const createSegmentPath = (index: number): string => {
    // Start angle at top (12 o'clock = -90 degrees = -Math.PI/2)
    const startAngle = -Math.PI / 2 + index * anglePerSegment + gapAngle / 2;
    const endAngle = -Math.PI / 2 + (index + 1) * anglePerSegment - gapAngle / 2;

    // Calculate outer arc points
    const x1Outer = center + outerRadius * Math.cos(startAngle);
    const y1Outer = center + outerRadius * Math.sin(startAngle);
    const x2Outer = center + outerRadius * Math.cos(endAngle);
    const y2Outer = center + outerRadius * Math.sin(endAngle);

    // Calculate inner arc points
    const x1Inner = center + innerRadius * Math.cos(startAngle);
    const y1Inner = center + innerRadius * Math.sin(startAngle);
    const x2Inner = center + innerRadius * Math.cos(endAngle);
    const y2Inner = center + innerRadius * Math.sin(endAngle);

    // Create the path
    // M = move to start of outer arc
    // A = arc to end of outer arc
    // L = line to start of inner arc
    // A = arc back along inner arc
    // Z = close path
    return `
      M ${x1Outer} ${y1Outer}
      A ${outerRadius} ${outerRadius} 0 0 1 ${x2Outer} ${y2Outer}
      L ${x2Inner} ${y2Inner}
      A ${innerRadius} ${innerRadius} 0 0 0 ${x1Inner} ${y1Inner}
      Z
    `;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0"
      style={{ pointerEvents: 'none' }}
    >
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius - 1}
        fill="transparent"
        stroke="rgba(255, 255, 255, 0.05)"
        strokeWidth="1"
      />

      {/* Render all 40 segments */}
      {participation.map((isActive, index) => (
        <path
          key={index}
          d={createSegmentPath(index)}
          fill={isActive ? finalActiveColor : finalInactiveColor}
          className={isActive ? 'transition-all duration-300' : ''}
        />
      ))}
    </svg>
  );
};
