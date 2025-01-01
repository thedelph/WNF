import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PlayerCard from '../../PlayerCard';
import { ExtendedPlayerData } from '../../../types/playerSelection';
import { calculatePlayerXP } from '../../../utils/xpCalculations';
import { supabase } from '../../../utils/supabase';

interface PlayerCardViewProps {
  players: ExtendedPlayerData[];
  title: string;
}

/**
 * PlayerCardView component displays players in a grid of cards
 * sorted alphabetically by friendly name with collapsible sections
 */
export const PlayerCardView: React.FC<PlayerCardViewProps> = ({ players, title }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [latestSequence, setLatestSequence] = useState(0);
  
  // Get latest game sequence
  useEffect(() => {
    const fetchLatestSequence = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('sequence_number')
        .order('sequence_number', { ascending: false })
        .limit(1);

      if (!error && data?.length) {
        setLatestSequence(Number(data[0].sequence_number));
      }
    };

    fetchLatestSequence();
  }, []);
  
  // Sort players alphabetically by friendly name
  const sortedPlayers = [...players].sort((a, b) => 
    a.friendly_name.localeCompare(b.friendly_name)
  );

  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-base-200 rounded-t-lg hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <span className="text-sm text-base-content/60">
            ({players.length} {players.length === 1 ? 'player' : 'players'})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-base-200 rounded-b-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedPlayers.map((player) => {
                  // Calculate XP with complete stats
                  const xp = calculatePlayerXP({
                    caps: player.stats.caps,
                    activeBonuses: player.stats.activeBonuses,
                    activePenalties: player.stats.activePenalties,
                    currentStreak: player.stats.currentStreak,
                    gameSequences: player.stats.gameSequences,
                    latestSequence
                  });

                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PlayerCard
                        id={player.id}
                        friendlyName={player.friendly_name}
                        xp={xp}
                        caps={player.stats.caps}
                        preferredPosition=""
                        activeBonuses={player.stats.activeBonuses}
                        activePenalties={player.stats.activePenalties}
                        winRate={player.win_rate}
                        currentStreak={player.stats.currentStreak}
                        maxStreak={player.max_streak}
                        rarity={player.rarity}
                        avatarSvg={player.avatar_svg}
                        isRandomlySelected={player.isRandomlySelected}
                        gameSequences={player.stats.gameSequences}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
