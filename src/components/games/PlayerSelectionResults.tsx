import React, { useEffect, useState, useMemo } from 'react';
import { FaUser, FaUserClock, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { calculatePlayerXP } from '../../utils/xpCalculations';
import { calculateRarity } from '../../utils/rarityCalculations';
import PlayerCard from '../PlayerCard';
import { supabase } from '../../utils/supabase';
import { useUser } from '../../hooks/useUser';
import { showDialog, useNavigate } from "../../utils/dialog";
import { handlePlayerSelfDropout } from '../../utils/dropoutHandler';
import { PlayerSelectionResultsProps, ExtendedPlayerData } from '../../types/playerSelection';
import { toast } from 'react-hot-toast';
import { SlotOfferCountdown } from './SlotOfferCountdown';

export const PlayerSelectionResults: React.FC<PlayerSelectionResultsProps> = ({ gameId }) => {
  const [selectedPlayers, setSelectedPlayers] = useState<ExtendedPlayerData[]>([]);
  const [reservePlayers, setReservePlayers] = useState<ExtendedPlayerData[]>([]);
  const [droppedOutPlayers, setDroppedOutPlayers] = useState<ExtendedPlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSelected, setShowSelected] = useState(true);
  const [showReserves, setShowReserves] = useState(false);
  const [showDroppedOut, setShowDroppedOut] = useState(false);
  const [gameDate, setGameDate] = useState<Date | null>(null);
  const [firstDropoutTime, setFirstDropoutTime] = useState<Date | null>(null);
  const { player } = useUser();
  const navigate = useNavigate();

  // Check if the current user has dropped out
  const hasDroppedOut = useMemo(() => {
    return droppedOutPlayers.some(p => p.id === player?.id);
  }, [droppedOutPlayers, player?.id]);

  const fetchGamePlayers = async () => {
    try {
      console.log('Fetching game players for game:', gameId);

      // Get game details first
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      const parsedGameDate = new Date(gameData.date);
      setGameDate(parsedGameDate);
      console.log('Game date:', parsedGameDate);

      // Get first dropout time
      const { data: dropoutData, error: dropoutError } = await supabase
        .from('game_registrations')
        .select('created_at')
        .eq('game_id', gameId)
        .eq('status', 'dropped_out')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (!dropoutError && dropoutData) {
        const parsedDropoutTime = new Date(dropoutData.created_at);
        setFirstDropoutTime(parsedDropoutTime);
        console.log('First dropout time:', parsedDropoutTime);
      } else {
        console.log('No dropouts found');
      }

      const { data: registrations, error } = await supabase
        .from('game_registrations')
        .select(`
          player_id,
          status,
          created_at,
          selection_method,
          players!game_registrations_player_id_fkey (
            id,
            friendly_name,
            caps,
            active_bonuses,
            active_penalties,
            current_streak,
            max_streak,
            win_rate,
            avatar_svg
          )
        `)
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch slot offers separately
      const { data: slotOffers, error: slotOffersError } = await supabase
        .from('slot_offers')
        .select('*')
        .eq('game_id', gameId);

      if (slotOffersError) throw slotOffersError;

      console.log('Slot offers:', slotOffers);

      const selected: ExtendedPlayerData[] = [];
      const reserves: ExtendedPlayerData[] = [];
      const droppedOut: ExtendedPlayerData[] = [];

      registrations?.forEach(reg => {
        const player = reg.players;
        if (!player) return;

        // Find slot offers for this player
        const playerSlotOffers = slotOffers?.filter(
          offer => offer.player_id === player.id
        ) || [];

        console.log('Player slot offers:', {
          player: player.friendly_name,
          offers: playerSlotOffers
        });

        const playerData: ExtendedPlayerData = {
          id: player.id,
          friendly_name: player.friendly_name,
          win_rate: player.win_rate || 0,
          max_streak: player.max_streak || 0,
          avatar_svg: player.avatar_svg || '',
          stats: {
            caps: player.caps || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            currentStreak: player.current_streak || 0,
            dropoutPenalties: 0  // This will need to be calculated from player_penalties table if needed
          },
          isRandomlySelected: reg.selection_method === 'random',
          selectionMethod: reg.selection_method || 'merit',
          preferredPosition: '',
          slotOffers: playerSlotOffers
        };

        if (reg.status === 'selected') {
          selected.push(playerData);
        } else if (reg.status === 'reserve') {
          reserves.push(playerData);
        } else if (reg.status === 'dropped_out') {
          droppedOut.push(playerData);
        }
      });

      console.log('Processed players:', {
        selected: selected.map(p => ({ 
          name: p.friendly_name, 
          method: p.selectionMethod,
          isRandom: p.isRandomlySelected 
        })),
        reserves: reserves.length,
        droppedOut: droppedOut.length
      });

      setSelectedPlayers(selected);
      setReservePlayers(reserves);
      setDroppedOutPlayers(droppedOut);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGamePlayers();
  }, [gameId]);

  const handleDropout = async () => {
    try {
      if (!player?.id || !gameId) {
        toast.error('Unable to drop out: Missing player or game information');
        return;
      }
      
      await handlePlayerSelfDropout(player.id, gameId);
      // Refresh the player lists after successful dropout
      await fetchGamePlayers();
    } catch (error) {
      console.error('Error dropping out:', error);
      // Error toast is already shown in handlePlayerSelfDropout
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="loading loading-spinner loading-lg"></div>
    </div>;
  }

  // Calculate XP values for all players and sort selected players by XP
  const allPlayers = [...selectedPlayers, ...reservePlayers, ...droppedOutPlayers];
  const allXpValues = allPlayers.map(player => calculatePlayerXP(player.stats));
  
  // Sort selected players by XP in descending order
  const sortedSelectedPlayers = [...selectedPlayers].sort((a, b) => {
    const xpA = calculatePlayerXP(a.stats);
    const xpB = calculatePlayerXP(b.stats);
    return xpB - xpA;
  });

  // Sort reserve players by XP in descending order
  const sortedReservePlayers = [...reservePlayers].sort((a, b) => {
    const xpA = calculatePlayerXP(a.stats);
    const xpB = calculatePlayerXP(b.stats);
    return xpB - xpA;
  });

  return (
    <div className="space-y-4">
      <button
        onClick={handleDropout}
        className={`btn btn-sm ${hasDroppedOut ? 'btn-disabled bg-gray-500 text-white cursor-not-allowed' : 'btn-error'}`}
        disabled={hasDroppedOut}
      >
        {hasDroppedOut ? 'DROPPED OUT' : 'DROP OUT'}
      </button>

      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowSelected(!showSelected)}
            className="btn btn-ghost btn-sm w-full flex justify-between items-center"
          >
            <span className="flex items-center gap-2">
              <FaUser />
              Selected Players ({selectedPlayers.length})
            </span>
            {showSelected ? <FaChevronDown /> : <FaChevronRight />}
          </button>
        </div>

        <AnimatePresence>
          {showSelected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedSelectedPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    id={player.id}
                    friendlyName={player.friendly_name}
                    caps={player.stats.caps}
                    preferredPosition=""
                    activeBonuses={player.stats.activeBonuses}
                    activePenalties={player.stats.activePenalties}
                    winRate={player.win_rate}
                    currentStreak={player.stats.currentStreak}
                    maxStreak={player.max_streak}
                    rarity={calculateRarity(calculatePlayerXP(player.stats), allXpValues)}
                    avatarSvg={player.avatar_svg}
                    isRandomlySelected={player.isRandomlySelected}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {reservePlayers.length > 0 && (
        <div className="flex flex-col space-y-4">
          <button
            onClick={() => setShowReserves(!showReserves)}
            className="btn btn-ghost btn-sm w-full flex justify-between items-center"
          >
            <span className="flex items-center gap-2">
              <FaUserClock />
              Reserve Players ({reservePlayers.length})
            </span>
            {showReserves ? <FaChevronDown /> : <FaChevronRight />}
          </button>

          <AnimatePresence>
            {showReserves && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sortedReservePlayers.map((player) => {
                    console.log('Rendering player card for:', player.friendly_name, {
                      hasSlotOffer: player.slotOffers?.some(offer => offer.status === 'pending'),
                      slotOfferStatus: player.slotOffers?.find(offer => 
                        offer.status === 'pending' || offer.status === 'accepted'
                      )?.status,
                      gameDate,
                      firstDropoutTime
                    });
                    return (
                      <PlayerCard
                        key={player.id}
                        id={player.id}
                        friendlyName={player.friendly_name}
                        caps={player.stats.caps}
                        preferredPosition=""
                        activeBonuses={player.stats.activeBonuses}
                        activePenalties={player.stats.activePenalties}
                        winRate={player.win_rate}
                        currentStreak={player.stats.currentStreak}
                        maxStreak={player.max_streak}
                        rarity={calculateRarity(calculatePlayerXP(player.stats), allXpValues)}
                        avatarSvg={player.avatar_svg}
                        hasSlotOffer={player.slotOffers?.some(offer => offer.status === 'pending')}
                        slotOfferStatus={player.slotOffers?.find(offer => 
                          offer.status === 'pending' || offer.status === 'accepted'
                        )?.status}
                      >
                        <div className="flex flex-col gap-1">
                          {gameDate && firstDropoutTime && (
                            <SlotOfferCountdown
                              player={player}
                              reservePlayers={sortedReservePlayers}
                              gameDate={gameDate}
                              firstDropoutTime={firstDropoutTime}
                            />
                          )}
                        </div>
                      </PlayerCard>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={() => setShowDroppedOut(!showDroppedOut)}
          className="btn btn-ghost btn-sm w-full flex justify-between items-center"
        >
          <span className="flex items-center gap-2">
            <FaUser />
            Dropped Out Players ({droppedOutPlayers.length})
          </span>
          {showDroppedOut ? <FaChevronDown /> : <FaChevronRight />}
        </button>

        <AnimatePresence>
          {showDroppedOut && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
                {droppedOutPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    id={player.id}
                    friendlyName={player.friendly_name}
                    caps={player.stats.caps}
                    preferredPosition=""
                    activeBonuses={player.stats.activeBonuses}
                    activePenalties={player.stats.activePenalties}
                    winRate={player.win_rate}
                    currentStreak={player.stats.currentStreak}
                    maxStreak={player.max_streak}
                    rarity={calculateRarity(calculatePlayerXP(player.stats), allXpValues)}
                    avatarSvg={player.avatar_svg}
                    isRandomlySelected={player.isRandomlySelected}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};