import { motion } from 'framer-motion';
import { PlayerStats } from '../../types/player';
import { User } from '@supabase/supabase-js';
import StarRating from '../StarRating';
import { formatStarRating, getRatingButtonText } from '../../utils/ratingFormatters';
import { AttributeCombination, generatePlaystyleName, generateAttributeAbbreviations } from '../../types/playstyle';
import { supabase } from '../../utils/supabase';
import { useEffect, useState } from 'react';

interface PlayerRatingProps {
  player: PlayerStats;
  user: User | null;
  onRatePlayer: () => void;
  ratings: {
    attack: number;
    defense: number;
    gameIq: number;
    gk: number;
  };
  setRatings: (ratings: { attack: number; defense: number; gameIq: number; gk: number }) => void;
}

export const PlayerRating = ({ player, user, onRatePlayer, ratings, setRatings }: PlayerRatingProps) => {
  const [playstyleAttributes, setPlaystyleAttributes] = useState<AttributeCombination | null>(null);
  const [playstyleName, setPlaystyleName] = useState<string>('');
  const [attributeAbbreviations, setAttributeAbbreviations] = useState<string>('');

  useEffect(() => {
    const fetchPlaystyleData = async () => {
      if (!user || !player.my_rating) return;

      try {
        // Get current player ID
        const { data: currentPlayer } = await supabase
          .from('players')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!currentPlayer) return;

        // Fetch the full rating including playstyle attributes
        const { data: ratingData } = await supabase
          .from('player_ratings')
          .select(`
            has_pace,
            has_shooting,
            has_passing,
            has_dribbling,
            has_defending,
            has_physical,
            playstyles:playstyle_id (
              id,
              name
            )
          `)
          .eq('rater_id', currentPlayer.id)
          .eq('rated_player_id', player.id)
          .maybeSingle();

        if (ratingData) {
          // Check if using individual attribute columns
          if (ratingData.has_pace !== null || ratingData.has_shooting !== null ||
              ratingData.has_passing !== null || ratingData.has_dribbling !== null ||
              ratingData.has_defending !== null || ratingData.has_physical !== null) {

            const attributes: AttributeCombination = {
              has_pace: ratingData.has_pace || false,
              has_shooting: ratingData.has_shooting || false,
              has_passing: ratingData.has_passing || false,
              has_dribbling: ratingData.has_dribbling || false,
              has_defending: ratingData.has_defending || false,
              has_physical: ratingData.has_physical || false,
            };

            setPlaystyleAttributes(attributes);

            // Generate abbreviations
            const abbrevs = generateAttributeAbbreviations(attributes);
            setAttributeAbbreviations(abbrevs);

            // Use database playstyle name if available, otherwise generate
            if (ratingData.playstyles?.name) {
              setPlaystyleName(ratingData.playstyles.name);
            } else {
              const name = generatePlaystyleName(attributes);
              if (name !== 'No Style Selected') {
                setPlaystyleName(name);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching playstyle data:', error);
      }
    };

    fetchPlaystyleData();
  }, [user, player]);

  // If no user is logged in, don't show anything
  if (!user) return null;

  // If user is viewing their own profile
  if (user.id === player.id) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl mb-8"
      >
        <div className="card-body">
          <h2 className="card-title">Player Rating</h2>
          <p className="text-gray-500">You cannot rate yourself</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl mb-8"
    >
      <div className="card-body">
        <h2 className="card-title">Player Rating</h2>
        
        {player?.games_played_together !== undefined && (
          <>
            {player.games_played_together >= 5 ? (
              <div className="space-y-4">
                {player.my_rating && (
                  <div className="text-sm text-gray-600">
                    <p>Your Current Ratings:</p>
                    <p>Attack: {formatStarRating(player.my_rating.attack_rating)}</p>
                    <p>Defense: {formatStarRating(player.my_rating.defense_rating)}</p>
                    <p>Game IQ: {formatStarRating(player.my_rating.game_iq_rating)}</p>
                    {playstyleName && (
                      <div className="mt-2">
                        <p className="font-semibold text-xs">Playstyle:</p>
                        <div className="mt-1">
                          <span className="text-xs font-medium text-primary">
                            {playstyleName}
                          </span>
                          {attributeAbbreviations && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({attributeAbbreviations})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn bg-primary hover:bg-primary/90 text-white h-10 min-h-0 px-4 py-0 flex items-center justify-center gap-2"
                  onClick={onRatePlayer}
                >
                  <span className="inline-flex items-center justify-center w-4 h-4">⭐</span>
                  <span className="font-medium">{getRatingButtonText(player.my_rating)}</span>
                </motion.button>
              </div>
            ) : (
              <p className="text-gray-500">
                You need to play {5 - player.games_played_together} more games with this player to rate them
              </p>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
