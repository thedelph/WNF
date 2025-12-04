import { motion } from 'framer-motion';
import { FIFAPlayerCard, PlayerCardData } from './FIFAPlayerCard';
import { FIFA_COLORS } from '../../constants/fifaTheme';
import { Search } from 'lucide-react';
import { useState } from 'react';

interface FIFAPlayerGridProps {
  players: PlayerCardData[];
  title?: string;
  showSearch?: boolean;
  onPlayerClick?: (player: PlayerCardData) => void;
}

// Sample player data for demo
export const SAMPLE_PLAYERS: PlayerCardData[] = [
  {
    id: '1',
    name: 'Daniel',
    position: 'ST',
    attack: 8.5,
    defense: 6.2,
    gameIq: 8.8,
    gk: 4.5,
    xp: 5200,
    caps: 89,
    winRate: 58,
  },
  {
    id: '2',
    name: 'Paul',
    position: 'CM',
    attack: 7.2,
    defense: 7.8,
    gameIq: 8.2,
    gk: 5.0,
    xp: 4800,
    caps: 85,
    winRate: 55,
  },
  {
    id: '3',
    name: 'Chris H',
    position: 'CAM',
    attack: 8.0,
    defense: 6.5,
    gameIq: 8.5,
    gk: 3.8,
    xp: 3500,
    caps: 72,
    winRate: 52,
  },
  {
    id: '4',
    name: 'Stephen',
    position: 'CB',
    attack: 5.5,
    defense: 8.8,
    gameIq: 7.5,
    gk: 6.0,
    xp: 2800,
    caps: 65,
    winRate: 54,
  },
  {
    id: '5',
    name: 'Phil R',
    position: 'GK',
    attack: 4.0,
    defense: 6.5,
    gameIq: 7.0,
    gk: 8.5,
    xp: 1800,
    caps: 45,
    winRate: 48,
  },
  {
    id: '6',
    name: 'Tom K',
    position: 'RW',
    attack: 7.8,
    defense: 5.5,
    gameIq: 7.2,
    gk: 3.5,
    xp: 1200,
    caps: 38,
    winRate: 51,
  },
  {
    id: '7',
    name: 'Jarman',
    position: 'CDM',
    attack: 6.0,
    defense: 8.2,
    gameIq: 7.8,
    gk: 4.5,
    xp: 800,
    caps: 28,
    winRate: 46,
  },
  {
    id: '8',
    name: 'Jack G',
    position: 'LB',
    attack: 5.8,
    defense: 7.5,
    gameIq: 6.8,
    gk: 4.0,
    xp: 350,
    caps: 15,
    winRate: 42,
  },
];

export const FIFAPlayerGrid = ({
  players = SAMPLE_PLAYERS,
  title = 'PLAYER ROSTER',
  showSearch = true,
  onPlayerClick,
}: FIFAPlayerGridProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h2
          style={{
            fontFamily: 'Oswald, sans-serif',
            fontSize: '24px',
            fontWeight: 600,
            color: FIFA_COLORS.accent.electric,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            margin: 0,
            textShadow: `0 0 20px ${FIFA_COLORS.accent.electric}40`,
          }}
        >
          {title}
        </h2>

        {showSearch && (
          <div
            style={{
              position: 'relative',
              minWidth: '200px',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)',
              }}
            />
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem 0.5rem 2.5rem',
                background: FIFA_COLORS.background.card,
                border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: '8px',
                color: 'white',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = `${FIFA_COLORS.accent.electric}60`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            />
          </div>
        )}
      </div>

      {/* Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
          },
        }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1.5rem',
          justifyItems: 'center',
        }}
      >
        {filteredPlayers.map((player, index) => (
          <motion.div
            key={player.id}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  type: 'spring',
                  stiffness: 100,
                  damping: 15,
                  delay: index * 0.03,
                },
              },
            }}
          >
            <FIFAPlayerCard
              player={player}
              onClick={onPlayerClick ? () => onPlayerClick(player) : undefined}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {filteredPlayers.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          No players found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
};

export default FIFAPlayerGrid;
