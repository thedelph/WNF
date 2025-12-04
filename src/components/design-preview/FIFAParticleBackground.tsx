import { useMemo } from 'react';
import { FIFA_COLORS } from '../../constants/fifaTheme';

interface Particle {
  id: number;
  left: number;
  size: number;
  glowSize: number;
  duration: number;
  delay: number;
  color: string;
  drift: number;
  peakOpacity: number;
}

/**
 * FIFA-style ambient particle configuration - SUBTLE VERSION
 * Design rationale:
 * - Very subtle background ambiance (not distracting)
 * - Low opacity with soft glow
 * - Slow, graceful movement
 * - Accent colors (cyan/purple) matching the UI palette
 */
const PARTICLE_CONFIG = {
  desktop: {
    count: 10,  // Reduced from 18
    colors: [
      FIFA_COLORS.accent.electric,  // Cyan - primary accent
      FIFA_COLORS.accent.purple,    // Purple - secondary accent
    ],
  },
  mobile: {
    count: 4,  // Reduced from 8
    colors: [FIFA_COLORS.accent.electric],
  },
};

export const FIFAParticleBackground = () => {
  const particles = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const config = isMobile ? PARTICLE_CONFIG.mobile : PARTICLE_CONFIG.desktop;

    return Array.from({ length: config.count }, (_, i): Particle => {
      const size = 2 + Math.random() * 2; // 2-4px (reduced from 3-6px)
      return {
        id: i,
        left: Math.random() * 100,
        size,
        glowSize: size * 2, // Subtle glow (reduced from 4x to 2x)
        duration: 25 + Math.random() * 20, // 25-45s - even slower
        delay: Math.random() * 15, // Staggered start over 15s
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        drift: (Math.random() - 0.5) * 60, // -30px to +30px subtle drift
        peakOpacity: 0.15 + Math.random() * 0.15, // 0.15-0.30 (much more subtle)
      };
    });
  }, []);

  // Generate unique keyframes for each particle with smooth easing
  const keyframes = particles.map(
    (p) => `
    @keyframes particleRise${p.id} {
      0% {
        transform: translateY(0) translateX(0) scale(0.5);
        opacity: 0;
      }
      15% {
        opacity: ${p.peakOpacity};
        transform: translateY(-15vh) translateX(${p.drift * 0.15}px) scale(1);
      }
      85% {
        opacity: ${p.peakOpacity};
        transform: translateY(-85vh) translateX(${p.drift * 0.85}px) scale(1);
      }
      100% {
        transform: translateY(-110vh) translateX(${p.drift}px) scale(0.5);
        opacity: 0;
      }
    }
  `
  ).join('\n');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <style>{keyframes}</style>
      {particles.map((particle) => (
        <div
          key={particle.id}
          style={{
            position: 'absolute',
            left: `${particle.left}%`,
            bottom: '-30px',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            borderRadius: '50%',
            backgroundColor: particle.color,
            // Multi-layer glow for soft bloom effect (FIFA-style)
            boxShadow: `
              0 0 ${particle.glowSize * 0.5}px ${particle.color},
              0 0 ${particle.glowSize}px ${particle.color}80,
              0 0 ${particle.glowSize * 1.5}px ${particle.color}40
            `,
            animation: `particleRise${particle.id} ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};
