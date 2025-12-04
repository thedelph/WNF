import { motion } from 'framer-motion';
import { FIFA_COLORS, getRarityFromXP } from '../../constants/fifaTheme';

export interface PlayerCardData {
  id: string;
  name: string;
  position?: string;
  attack?: number | null;
  defense?: number | null;
  gameIq?: number | null;
  gk?: number | null;
  xp?: number;
  caps?: number;
  winRate?: number;
  avatarUrl?: string;
}

interface FIFAPlayerCardProps {
  player: PlayerCardData;
  size?: 'normal' | 'large';
  onClick?: () => void;
}

// Get rarity colors based on XP
const getRarityColors = (xp: number = 0) => {
  const rarity = getRarityFromXP(xp);
  const colors = {
    bronze: {
      primary: '#cd7f32',
      glow: 'rgba(205, 127, 50, 0.4)',
      gradient: 'linear-gradient(135deg, #8B4513 0%, #cd7f32 50%, #8B4513 100%)',
    },
    silver: {
      primary: '#c0c0c0',
      glow: 'rgba(192, 192, 192, 0.4)',
      gradient: 'linear-gradient(135deg, #808080 0%, #c0c0c0 50%, #808080 100%)',
    },
    gold: {
      primary: '#ffd700',
      glow: 'rgba(255, 215, 0, 0.5)',
      gradient: 'linear-gradient(135deg, #B8860B 0%, #ffd700 50%, #B8860B 100%)',
    },
    totw: {
      primary: '#1e90ff',
      glow: 'rgba(30, 144, 255, 0.5)',
      gradient: 'linear-gradient(135deg, #0066cc 0%, #1e90ff 50%, #0066cc 100%)',
    },
    icon: {
      primary: '#ff6b35',
      glow: 'rgba(255, 107, 53, 0.6)',
      gradient: 'linear-gradient(135deg, #cc4400 0%, #ff6b35 50%, #ff8c00 100%)',
    },
  };
  return colors[rarity];
};

// Calculate overall rating from attributes
const calculateOverall = (player: PlayerCardData): number => {
  const attrs = [player.attack, player.defense, player.gameIq, player.gk].filter(
    (v) => v !== null && v !== undefined
  ) as number[];
  if (attrs.length === 0) return 0;
  return Math.round(attrs.reduce((a, b) => a + b, 0) / attrs.length);
};

// Get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Format rating value
const formatRating = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  return Math.round(value * 10).toString();
};

export const FIFAPlayerCard = ({ player, size = 'normal', onClick }: FIFAPlayerCardProps) => {
  const rarityColors = getRarityColors(player.xp);
  const overall = calculateOverall(player);
  const isLarge = size === 'large';

  const cardWidth = isLarge ? 280 : 220;
  const cardHeight = isLarge ? 380 : 300;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: cardWidth,
        height: cardHeight,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Card Background with Rarity Border */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: rarityColors.gradient,
          borderRadius: '16px',
          padding: '3px',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: `linear-gradient(180deg, ${FIFA_COLORS.background.card} 0%, ${FIFA_COLORS.background.primary} 100%)`,
            borderRadius: '14px',
            overflow: 'hidden',
          }}
        >
          {/* Shine Effect */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.08) 50%, transparent 75%)',
              animation: 'shine 4s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />

          {/* Content */}
          <div
            style={{
              padding: isLarge ? '1.5rem' : '1rem',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Top Section: Overall Rating & Avatar */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '0.75rem',
              }}
            >
              {/* Overall Rating */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    fontSize: isLarge ? '48px' : '36px',
                    fontWeight: 700,
                    color: rarityColors.primary,
                    lineHeight: 1,
                    textShadow: `0 0 20px ${rarityColors.glow}`,
                  }}
                >
                  {overall}
                </span>
                {player.position && (
                  <span
                    style={{
                      fontFamily: 'Oswald, sans-serif',
                      fontSize: isLarge ? '14px' : '12px',
                      fontWeight: 500,
                      color: rarityColors.primary,
                      letterSpacing: '1px',
                      marginTop: '2px',
                    }}
                  >
                    {player.position}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {player.avatarUrl ? (
                  <img
                    src={player.avatarUrl}
                    alt={player.name}
                    style={{
                      width: isLarge ? '100px' : '80px',
                      height: isLarge ? '100px' : '80px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `2px solid ${rarityColors.primary}40`,
                      boxShadow: `0 0 15px ${rarityColors.glow}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: isLarge ? '100px' : '80px',
                      height: isLarge ? '100px' : '80px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${rarityColors.primary}30, ${rarityColors.primary}10)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${rarityColors.primary}40`,
                      boxShadow: `0 0 15px ${rarityColors.glow}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Oswald, sans-serif',
                        fontSize: isLarge ? '32px' : '24px',
                        fontWeight: 700,
                        color: rarityColors.primary,
                      }}
                    >
                      {getInitials(player.name)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                height: '1px',
                background: `linear-gradient(90deg, transparent, ${rarityColors.primary}60, transparent)`,
                margin: '0.5rem 0',
              }}
            />

            {/* Player Name */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <h3
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  fontSize: isLarge ? '20px' : '16px',
                  fontWeight: 600,
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  margin: 0,
                }}
              >
                {player.name}
              </h3>
            </div>

            {/* Attributes Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5rem',
                marginBottom: '0.75rem',
              }}
            >
              {[
                { label: 'ATK', value: player.attack },
                { label: 'DEF', value: player.defense },
                { label: 'IQ', value: player.gameIq },
                { label: 'GK', value: player.gk },
              ].map((attr) => (
                <div key={attr.label} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.5)',
                      marginBottom: '2px',
                    }}
                  >
                    {attr.label}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Oswald, sans-serif',
                      fontSize: isLarge ? '20px' : '16px',
                      fontWeight: 600,
                      color: getAttributeColor(attr.value),
                    }}
                  >
                    {formatRating(attr.value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Attribute Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              {[
                { label: 'ATK', value: player.attack, color: FIFA_COLORS.accent.pink },
                { label: 'DEF', value: player.defense, color: FIFA_COLORS.accent.electric },
                { label: 'IQ', value: player.gameIq, color: FIFA_COLORS.accent.purple },
                { label: 'GK', value: player.gk, color: FIFA_COLORS.accent.gold },
              ].map((attr) => (
                <AttributeBar
                  key={attr.label}
                  value={attr.value}
                  color={attr.color}
                  compact={!isLarge}
                />
              ))}
            </div>

            {/* Footer Stats */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 'auto',
                paddingTop: '0.5rem',
                borderTop: `1px solid rgba(255,255,255,0.1)`,
              }}
            >
              <StatItem label="XP" value={player.xp?.toLocaleString() ?? '-'} />
              <StatItem label="CAPS" value={player.caps?.toString() ?? '-'} />
              <StatItem
                label="WIN%"
                value={player.winRate !== undefined ? `${Math.round(player.winRate)}%` : '-'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Outer Glow */}
      <div
        style={{
          position: 'absolute',
          inset: '-4px',
          borderRadius: '20px',
          background: `radial-gradient(ellipse at center, ${rarityColors.glow} 0%, transparent 70%)`,
          opacity: 0.3,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
    </motion.div>
  );
};

// Attribute Bar Component
const AttributeBar = ({
  value,
  color,
  compact,
}: {
  value: number | null | undefined;
  color: string;
  compact: boolean;
}) => {
  const percentage = value !== null && value !== undefined ? (value / 10) * 100 : 0;

  return (
    <div
      style={{
        height: compact ? '4px' : '6px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          height: '100%',
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius: '2px',
          boxShadow: percentage > 70 ? `0 0 8px ${color}` : 'none',
        }}
      />
    </div>
  );
};

// Footer Stat Item
const StatItem = ({ label, value }: { label: string; value: string }) => (
  <div style={{ textAlign: 'center' }}>
    <div
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '9px',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: '1px',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: 'Oswald, sans-serif',
        fontSize: '12px',
        fontWeight: 500,
        color: 'rgba(255,255,255,0.9)',
      }}
    >
      {value}
    </div>
  </div>
);

// Get color based on attribute value
const getAttributeColor = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'rgba(255,255,255,0.4)';
  const scaled = value * 10;
  if (scaled >= 85) return FIFA_COLORS.accent.green;
  if (scaled >= 70) return FIFA_COLORS.accent.electric;
  if (scaled >= 50) return 'rgba(255,255,255,0.9)';
  return 'rgba(255,255,255,0.6)';
};

export default FIFAPlayerCard;
